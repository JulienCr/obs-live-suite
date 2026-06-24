# realtime-stt

Mic → VAD → faster-whisper (FR) → POST segments to the OBS Live Suite backend.

## Setup
    cd realtime-stt
    python -m venv .venv && .venv/Scripts/activate   # Windows
    pip install -r requirements.txt
    cp config.example.json config.json   # edit backend URL if needed

## Run
    python main.py

Picks the input device from Settings > Assistant Live (reported back to the dashboard).
The `+15s` window logic and all action decisions live in the Node backend — this service
only captures and transcribes. Replaceable in Rust later behind the same `/api/stt/segment` contract.
