"""Real-time French STT bridge: mic capture → VAD → faster-whisper → POST segments.
Capture + inference only — all logic lives in the Node backend (per the spec)."""
import json, os, time, threading
import numpy as np
import sounddevice as sd
import httpx
from faster_whisper import WhisperModel
from stt.segmenter import build_segment

# The dev backend serves self-signed mkcert/Tailscale certs over HTTPS, so we
# skip certificate verification (mirrors the app's NODE_TLS_REJECT_UNAUTHORIZED=0
# dev posture). One shared client for all calls.
CLIENT = httpx.Client(verify=False, timeout=5)


def load_config():
    cfg = {"backend": "https://127.0.0.1:3002"}
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
    capture_start = time.monotonic()
    device_index = int(remote["inputDevice"]) if remote.get("inputDevice") else None

    # VAD-gated chunking: accumulate speech, transcribe on a silence boundary.
    # (Use silero-vad or webrtcvad here; pseudocode loop kept minimal.)
    # The callback runs on PortAudio's audio thread while the main loop drains the
    # buffer, so all buffer access is guarded by a lock to avoid losing a frame
    # that arrives between concatenate() and clear().
    buffer = []
    buffer_lock = threading.Lock()
    def callback(indata, frames, t, status):
        with buffer_lock:
            buffer.append(indata.copy())

    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="float32",
                        device=device_index, callback=callback):
        print(f"[stt] listening on device {device_index}")
        last_cfg = remote
        while True:
            time.sleep(2.0)  # batch ~2s of audio; replace with VAD silence detection
            # Re-poll config each iteration so toggling enabled takes effect within
            # one loop. Keep the last known config when the backend is momentarily
            # unreachable so a blip doesn't disable capture and discard speech.
            cfg_now = fetch_config(backend) or last_cfg
            last_cfg = cfg_now
            if not cfg_now.get("enabled", False):
                with buffer_lock:
                    buffer.clear()
                continue
            # Atomically swap out the captured chunks so a frame arriving mid-drain
            # is preserved for the next iteration instead of being cleared away.
            with buffer_lock:
                if not buffer:
                    continue
                chunks = buffer[:]
                buffer.clear()
            audio = np.concatenate(chunks).flatten()
            t1_ms = int((time.monotonic() - capture_start) * 1000)
            t0_ms = t1_ms - int(len(audio) / sample_rate * 1000)
            segments, _ = model.transcribe(audio, language="fr", vad_filter=True)
            text = " ".join(s.text.strip() for s in segments).strip()
            if not text:
                continue
            print(f"[stt] » {text}")
            seg = build_segment(text, t0_ms, t1_ms, True)
            try:
                CLIENT.post(f"{backend}/api/stt/segment", json=seg)
            except Exception as e:
                print(f"[stt] segment post failed: {e}")


if __name__ == "__main__":
    run()
