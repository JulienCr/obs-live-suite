"""Pure, hardware-free gates for the STT capture loop.

These functions hold the silence/low-confidence/segmentation logic so it can be
unit-tested without audio hardware or the ONNX VAD model (see tests/test_gates.py).
The loop in main.py wires them to live audio. Three layered gates:

  (a) is_silence       — skip Whisper on near-silent audio (energy/RMS).
  (b) keep_segment     — drop hallucinated/low-confidence segments after Whisper.
  (c) decide_flush     — drive segment flushing off VAD speech regions, not a clock.

`segment_confidence` and `span_to_ms` are small pure helpers used alongside them.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np


def is_silence(audio: np.ndarray, threshold: float) -> bool:
    """True when `audio` is empty or its RMS amplitude is below `threshold`.

    Gate (a): a cheap pre-Whisper guard. RMS is accumulated in float64 for
    numerical stability on long float32 spans.
    """
    if audio is None or len(audio) == 0:
        return True
    arr = np.asarray(audio, dtype=np.float64)
    rms = float(np.sqrt(np.mean(arr * arr)))
    return rms < threshold


def keep_segment(
    no_speech_prob: float,
    avg_logprob: float,
    compression_ratio: float,
    no_speech_prob_max: float = 0.6,
    avg_logprob_min: float = -1.0,
    compression_ratio_max: float = 2.4,
) -> bool:
    """True when a faster-whisper segment looks like real speech.

    Gate (b): faster-whisper already computes these per-segment scores; the
    loop used to throw them away. A segment is kept only when it clears all
    three bars (the defaults match faster-whisper's own internal thresholds):
      - no_speech_prob <= max   (high ⇒ the model thinks it's silence)
      - avg_logprob    >= min   (low  ⇒ low-confidence decode)
      - compression_ratio <= max (high ⇒ repetitive hallucination)
    """
    return (
        no_speech_prob <= no_speech_prob_max
        and avg_logprob >= avg_logprob_min
        and compression_ratio <= compression_ratio_max
    )


def segment_confidence(avg_logprobs: Sequence[float]) -> Optional[float]:
    """Map kept segments' avg_logprob to a [0, 1] confidence, or None if empty.

    avg_logprob is a (mostly negative) log-probability; exp() maps it into (0, 1].
    The mean is clamped to [0, 1] so it satisfies the backend's `confidence` schema.
    """
    if avg_logprobs is None or len(avg_logprobs) == 0:
        return None
    mean_exp = float(np.mean([math.exp(lp) for lp in avg_logprobs]))
    return max(0.0, min(1.0, mean_exp))


@dataclass(frozen=True)
class FlushDecision:
    """A request to flush `pending[start:end]` as one utterance.

    `reason` is "silence" (a clean end-of-utterance boundary) or "max" (a forced
    flush because the utterance hit the max-length cap while still ongoing).
    """

    start: int  # local sample index into pending (inclusive)
    end: int  # local sample index into pending (exclusive)
    reason: str  # "silence" | "max"


def decide_flush(
    regions: List[Dict[str, int]],
    total_samples: int,
    sr: int,
    silence_hangover_ms: int,
    max_utterance_ms: int,
) -> Optional[FlushDecision]:
    """Decide whether to flush the pending buffer, given Silero VAD speech regions.

    Gate (c), pure core. `regions` is the output of `get_speech_timestamps` (a
    list of {"start","end"} sample indices over a buffer of `total_samples`).

    While speech is *ongoing* at the buffer tail, Silero pins the last region's
    end to the buffer end, so `total_samples - end == 0`. Once a silence longer
    than the VAD's own `min_silence_duration_ms` terminates the region, the end
    falls back and trailing silence appears (> 0). That transition — not a wall
    clock — is the end-of-utterance signal. An external `silence_hangover_ms`
    can require extra trailing silence on top (the VAD already owns the hangover,
    so it defaults to 0). A force-flush fires when the buffer reaches the
    max-length cap even though speech is still live.
    """
    if not regions:
        return None
    span_start = regions[0]["start"]
    span_end = regions[-1]["end"]
    trailing = total_samples - span_end
    hangover_samples = silence_hangover_ms * sr // 1000
    if trailing > 0 and trailing >= hangover_samples:
        return FlushDecision(span_start, span_end, "silence")
    if total_samples >= max_utterance_ms * sr // 1000:
        return FlushDecision(span_start, span_end, "max")
    return None


def span_to_ms(
    span_start: int, span_end: int, pending_start_sample: int, sr: int
) -> Tuple[int, int]:
    """Map a [start, end) sample span within `pending` to relative-ms (t0, t1).

    `pending_start_sample` is the absolute index of pending[0] in the continuous
    capture stream, so timestamps stay aligned even as `pending` is trimmed.
    """
    t0 = int(round((pending_start_sample + span_start) / sr * 1000))
    t1 = int(round((pending_start_sample + span_end) / sr * 1000))
    if t1 < t0:
        t1 = t0
    return t0, t1
