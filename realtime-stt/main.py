"""Real-time French STT bridge: mic capture → VAD → faster-whisper → POST segments.
Capture + inference only — all logic lives in the Node backend (per the spec)."""
import json, os, time, threading
import numpy as np
import sounddevice as sd
import httpx
from faster_whisper import WhisperModel
from stt.segmenter import build_segment

def load_config():
    cfg = {"backend": "http://127.0.0.1:3002"}
    path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(path):
        cfg.update(json.load(open(path, encoding="utf-8")))
    return cfg

def report_devices(backend):
    devices = [{"id": str(i), "label": d["name"]}
               for i, d in enumerate(sd.query_devices()) if d["max_input_channels"] > 0]
    try:
        httpx.post(f"{backend}/api/stt/devices", json={"devices": devices}, timeout=5)
    except Exception as e:
        print(f"[stt] device report failed: {e}")

def fetch_config(backend):
    try:
        return httpx.get(f"{backend}/api/stt/config", timeout=5).json()
    except Exception:
        return {"enabled": False, "inputDevice": None, "whisperModel": "large-v3"}

def run():
    cfg = load_config()
    backend = cfg["backend"]
    report_devices(backend)
    remote = fetch_config(backend)
    model = WhisperModel(remote.get("whisperModel", "large-v3"), device="cuda", compute_type="int8")
    sample_rate = 16000
    capture_start = time.monotonic()
    device_index = int(remote["inputDevice"]) if remote.get("inputDevice") else None

    # VAD-gated chunking: accumulate speech, transcribe on a silence boundary.
    # (Use silero-vad or webrtcvad here; pseudocode loop kept minimal.)
    buffer = []
    def callback(indata, frames, t, status):
        buffer.append(indata.copy())

    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="float32",
                        device=device_index, callback=callback):
        print(f"[stt] listening on device {device_index}")
        while True:
            time.sleep(2.0)  # batch ~2s of audio; replace with VAD silence detection
            # Re-poll config each iteration so toggling enabled takes effect within one loop.
            cfg_now = fetch_config(backend)
            if not cfg_now.get("enabled", False):
                buffer.clear()
                continue
            if not buffer:
                continue
            audio = np.concatenate(buffer).flatten()
            buffer.clear()
            t1_ms = int((time.monotonic() - capture_start) * 1000)
            t0_ms = t1_ms - int(len(audio) / sample_rate * 1000)
            segments, _ = model.transcribe(audio, language="fr", vad_filter=True)
            text = " ".join(s.text.strip() for s in segments).strip()
            if not text:
                continue
            seg = build_segment(text, t0_ms, t1_ms, True)
            try:
                httpx.post(f"{backend}/api/stt/segment", json=seg, timeout=5)
            except Exception as e:
                print(f"[stt] segment post failed: {e}")

if __name__ == "__main__":
    run()
