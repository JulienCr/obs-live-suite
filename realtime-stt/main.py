"""Real-time French STT bridge: mic capture → VAD → faster-whisper → POST segments.
Capture + inference only — all logic lives in the Node backend (per the spec)."""
import json, os, time, threading
import numpy as np
import sounddevice as sd
import httpx
from faster_whisper import WhisperModel
from faster_whisper.vad import VadOptions, get_speech_timestamps
from stt.segmenter import build_segment
from stt.gates import decide_flush, is_silence, keep_segment, segment_confidence, span_to_ms

# The dev backend serves self-signed mkcert/Tailscale certs over HTTPS, so we
# skip certificate verification (mirrors the app's NODE_TLS_REJECT_UNAUTHORIZED=0
# dev posture). One shared client for all calls.
CLIENT = httpx.Client(verify=False, timeout=5)

# Gate thresholds — sane defaults in code so a missing config.json still works.
# config.json overrides any of these (alongside "backend"). The remote
# /api/stt/config only carries enabled/inputDevice/whisperModel; these tuning
# knobs are local because they describe this machine's mic/room, not the show.
GATE_DEFAULTS = {
    "silence_rms": 0.008,            # (a) RMS below this ⇒ skip Whisper
    "no_speech_prob_max": 0.6,       # (b) drop segments above this no_speech_prob
    "avg_logprob_min": -1.0,         # (b) drop segments below this avg_logprob
    "compression_ratio_max": 2.4,    # (b) drop segments above this (repetition)
    "vad_threshold": 0.5,            # (c) Silero speech probability threshold
    "vad_silence_ms": 700,           # (c) end-of-utterance hangover; MUST be > vad_speech_pad_ms
    "vad_min_speech_ms": 250,        # (c) drop speech blips shorter than this
    "vad_speech_pad_ms": 200,        # (c) onset/offset context kept around speech
    "vad_max_utterance_ms": 12000,   # (c) force-flush cap (bounds memory + VAD cost)
    "vad_tick_ms": 300,              # (c) loop cadence; adds to end-of-utterance latency
    "config_poll_ms": 2000,          # heartbeat: /api/stt/config poll cadence
    "silence_hangover_ms": 0,        # (c) extra trailing silence; VAD owns the hangover
    "vad_idle_ms": 3000,             # (c) trim pending after this much speech-free audio
    "vad_preroll_ms": 200,           # (c) tail kept on idle-trim / forced-flush overlap
}

# Rate-limit the "still gating silence" heartbeat so long silences don't flood
# stt-out.log while still proving the gate is alive.
IDLE_LOG_INTERVAL_MS = 30_000


def load_config():
    cfg = {"backend": "https://127.0.0.1:3002", **GATE_DEFAULTS}
    path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            cfg.update(json.load(f))
    return cfg


def resolve_backend(base, attempts=15, delay=2.0):
    """The backend serves HTTPS when certs exist, else HTTP. Probe both schemes
    against /health (retrying while it boots) and lock onto the one that answers —
    avoids the 'illegal request line' error from sending HTTP to an HTTPS server."""
    rest = base.split("://", 1)[-1]
    candidates = [f"https://{rest}", f"http://{rest}"]
    for _ in range(attempts):
        for url in candidates:
            try:
                CLIENT.get(f"{url}/health")
                print(f"[stt] backend reachable at {url}")
                return url
            except Exception:
                continue
        print(f"[stt] backend not reachable yet, retrying in {delay:.0f}s…")
        time.sleep(delay)
    print(f"[stt] backend never answered; defaulting to {candidates[0]}")
    return candidates[0]


def list_input_devices():
    """One clean entry per physical input device.

    PortAudio lists every device once per host API (MME, DirectSound, WASAPI,
    WDM-KS), so the same mic shows up many times, and the Windows MME API
    truncates names to 31 chars. We keep the fullest name and drop any entry
    whose name is just a (truncated) prefix of an already-kept one — which also
    removes exact cross-host-API duplicates."""
    raw = []
    for i, d in enumerate(sd.query_devices()):
        if d.get("max_input_channels", 0) <= 0:
            continue
        raw_name = (d.get("name") or "").strip()
        if not raw_name:
            continue
        # Bluetooth hands-free names embed multi-line registry paths; keep line 1.
        name = raw_name.splitlines()[0].strip()
        if name:
            raw.append((i, name))
    # Longest names first, so a truncated/duplicate name is seen as a prefix of a kept one.
    raw.sort(key=lambda x: len(x[1]), reverse=True)
    kept = []
    for idx, name in raw:
        low = name.lower()
        if any(k.lower().startswith(low) for _, k in kept):
            continue
        kept.append((idx, name))
    kept.sort(key=lambda x: x[0])
    return [{"id": str(idx), "label": name} for idx, name in kept]


def report_devices(backend, attempts=15, delay=2.0):
    """Report input devices to the backend, retrying until it's reachable, so the
    device dropdown in Settings fills even if this service starts before the backend."""
    devices = list_input_devices()
    for _ in range(attempts):
        try:
            CLIENT.post(f"{backend}/api/stt/devices", json={"devices": devices})
            print(f"[stt] reported {len(devices)} input device(s)")
            return
        except Exception as e:
            print(f"[stt] device report failed, retrying in {delay:.0f}s: {e}")
            time.sleep(delay)
    print("[stt] gave up reporting devices after retries")


def fetch_config(backend):
    """Return the backend config, or None if it's unreachable. The caller keeps
    the last known config on None — a transient blip must NOT be read as
    'disabled', which would clear the buffer and drop already-captured speech."""
    try:
        return CLIENT.get(f"{backend}/api/stt/config").json()
    except Exception:
        return None


def run():
    cfg = load_config()
    backend = resolve_backend(cfg["backend"])
    # Report devices in the background so it doesn't block model load / capture.
    threading.Thread(target=report_devices, args=(backend,), daemon=True).start()
    remote = fetch_config(backend) or {"enabled": False, "inputDevice": None, "whisperModel": "large-v3"}
    model = WhisperModel(remote.get("whisperModel", "large-v3"), device="cuda", compute_type="int8")
    sample_rate = 16000
    device_index = int(remote["inputDevice"]) if remote.get("inputDevice") else None

    # Resolve gate thresholds once at startup (local config.json over GATE_DEFAULTS).
    silence_rms = float(cfg["silence_rms"])
    no_speech_prob_max = float(cfg["no_speech_prob_max"])
    avg_logprob_min = float(cfg["avg_logprob_min"])
    compression_ratio_max = float(cfg["compression_ratio_max"])
    vad_threshold = float(cfg["vad_threshold"])
    vad_silence_ms = int(cfg["vad_silence_ms"])
    vad_min_speech_ms = int(cfg["vad_min_speech_ms"])
    vad_speech_pad_ms = int(cfg["vad_speech_pad_ms"])
    vad_max_utterance_ms = int(cfg["vad_max_utterance_ms"])
    vad_tick_ms = int(cfg["vad_tick_ms"])
    config_poll_ms = int(cfg["config_poll_ms"])
    silence_hangover_ms = int(cfg["silence_hangover_ms"])
    vad_idle_ms = int(cfg["vad_idle_ms"])
    vad_preroll_ms = int(cfg["vad_preroll_ms"])
    # Invariant: at end-of-utterance the measured trailing silence is about
    # vad_silence_ms − vad_speech_pad_ms (Silero pads each region by speech_pad_ms,
    # which under-reports the gap). That must clear silence_hangover_ms (and be > 0),
    # else no end-of-utterance boundary can ever be detected (see docs/LIVE-ASSIST.md).
    effective_trailing_ms = vad_silence_ms - vad_speech_pad_ms
    if effective_trailing_ms <= max(silence_hangover_ms, 0):
        print(f"[stt] WARN vad_silence_ms({vad_silence_ms}) - vad_speech_pad_ms({vad_speech_pad_ms}) "
              f"= {effective_trailing_ms}ms <= silence_hangover_ms({silence_hangover_ms}); "
              f"silence boundaries may never fire")

    vad_options = VadOptions(
        threshold=vad_threshold,
        min_speech_duration_ms=vad_min_speech_ms,
        speech_pad_ms=vad_speech_pad_ms,
        min_silence_duration_ms=vad_silence_ms,  # this is the end-of-utterance hangover
    )
    # Don't bother running VAD until pending could hold one emittable utterance.
    min_emit_samples = (vad_min_speech_ms + vad_speech_pad_ms) * sample_rate // 1000
    preroll_samples = vad_preroll_ms * sample_rate // 1000
    idle_samples = vad_idle_ms * sample_rate // 1000

    # The PortAudio callback fills `buffer` on its own thread; the main loop drains
    # it under the lock. `captured_samples` is the absolute count of samples seen so
    # far — it anchors segment timestamps (immune to tick/scheduling jitter).
    buffer = []
    buffer_lock = threading.Lock()
    captured_samples = 0

    def callback(indata, frames, t, status):
        nonlocal captured_samples
        if status:
            print(f"[stt] audio status: {status}")
        with buffer_lock:
            buffer.append(indata.copy())
            captured_samples += len(indata)

    # `pending` accumulates captured audio between flushes; `pending_start_sample`
    # is the absolute index of pending[0], so a span maps back to relative-ms.
    pending = np.empty(0, dtype=np.float32)
    pending_start_sample = 0

    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="float32",
                        device=device_index, callback=callback):
        print(f"[stt] listening on device {device_index}")
        last_cfg = remote
        last_cfg_ms = 0.0
        last_idle_log_ms = 0.0

        while True:
            time.sleep(vad_tick_ms / 1000.0)
            now_ms = time.monotonic() * 1000.0

            # Heartbeat: poll /api/stt/config on its own cadence (not every tick, or
            # a 300ms loop would hammer the backend). Keep last_cfg on a blip so a
            # transient failure isn't read as "disabled" and doesn't drop speech.
            if now_ms - last_cfg_ms >= config_poll_ms:
                last_cfg = fetch_config(backend) or last_cfg
                last_cfg_ms = now_ms

            if not last_cfg.get("enabled", False):
                with buffer_lock:
                    buffer.clear()
                pending = np.empty(0, dtype=np.float32)
                continue

            # Drain newly captured chunks under the lock; snapshot the absolute
            # sample count so a fresh `pending` gets the right start index.
            with buffer_lock:
                chunks = buffer[:]
                buffer.clear()
                captured_at_drain = captured_samples
            if chunks:
                new_audio = np.concatenate(chunks).flatten().astype(np.float32, copy=False)
                if pending.size == 0:
                    pending_start_sample = captured_at_drain - len(new_audio)
                    pending = new_audio
                else:
                    pending = np.concatenate((pending, new_audio))

            # Skip the O(n) VAD recompute when nothing new arrived or there isn't
            # yet enough audio to contain an utterance.
            if not chunks or pending.size < min_emit_samples:
                continue

            regions = get_speech_timestamps(pending, vad_options, sampling_rate=sample_rate)

            if not regions:
                # Pure silence accumulating: bound memory by keeping only a short
                # pre-roll tail (so a word onset right after isn't clipped).
                if pending.size > idle_samples:
                    drop = pending.size - preroll_samples
                    pending = pending[drop:]
                    pending_start_sample += drop
                if now_ms - last_idle_log_ms >= IDLE_LOG_INTERVAL_MS:
                    print("[stt] silence — no speech, transcription gated")
                    last_idle_log_ms = now_ms
                continue

            fd = decide_flush(regions, pending.size, sample_rate,
                              silence_hangover_ms, vad_max_utterance_ms)
            if fd is None:
                continue

            # Plain contiguous slice (NOT collect_chunks, which drops internal
            # silences and would desync the sample→ms mapping).
            emit = pending[fd.start:fd.end]
            t0_ms, t1_ms = span_to_ms(fd.start, fd.end, pending_start_sample, sample_rate)
            # On a clean silence boundary, cut at the speech end (retained trailing
            # silence becomes the next utterance's padded lead-in). On a forced
            # max-length flush, speech is still live, so keep a pre-roll overlap so
            # the word straddling the cut isn't lost.
            cut = fd.end if fd.reason == "silence" else max(fd.end - preroll_samples, 0)
            pending = pending[cut:]
            pending_start_sample += cut

            # Gate (a): cheap RMS guard before paying for a GPU transcribe.
            if is_silence(emit, silence_rms):
                print(f"[stt] gated: near-silent span ({fd.reason}, {t1_ms - t0_ms}ms)")
                continue

            segments, _ = model.transcribe(
                emit, language="fr", vad_filter=False, condition_on_previous_text=False)
            # Gate (b): keep only confident, non-hallucinated segments.
            kept = [s for s in segments
                    if keep_segment(s.no_speech_prob, s.avg_logprob, s.compression_ratio,
                                    no_speech_prob_max, avg_logprob_min, compression_ratio_max)]
            text = " ".join(s.text.strip() for s in kept).strip()
            if not text:
                print(f"[stt] gated: low-confidence/empty transcript ({fd.reason}, {t1_ms - t0_ms}ms)")
                continue
            conf = segment_confidence([s.avg_logprob for s in kept])
            print(f"[stt] » {text}")
            seg = build_segment(text, t0_ms, t1_ms, True, conf)
            try:
                CLIENT.post(f"{backend}/api/stt/segment", json=seg)
            except Exception as e:
                print(f"[stt] segment post failed: {e}")


if __name__ == "__main__":
    run()
