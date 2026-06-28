import math

import numpy as np
import pytest

from stt.gates import (
    FlushDecision,
    decide_flush,
    is_silence,
    keep_segment,
    segment_confidence,
    span_to_ms,
)

SR = 16000


# --- is_silence (gate a) -----------------------------------------------------

def test_is_silence_empty_is_silent():
    assert is_silence(np.empty(0, dtype=np.float32), 0.008) is True


def test_is_silence_all_zeros_is_silent():
    assert is_silence(np.zeros(1600, dtype=np.float32), 0.008) is True


def test_is_silence_loud_sine_is_not_silent():
    t = np.arange(1600, dtype=np.float32)
    sine = (0.2 * np.sin(2 * np.pi * 440 * t / SR)).astype(np.float32)  # RMS ~0.14
    assert is_silence(sine, 0.008) is False


def test_is_silence_low_noise_is_silent():
    noise = np.full(1600, 0.002, dtype=np.float32)  # RMS 0.002 < 0.008
    assert is_silence(noise, 0.008) is True


def test_is_silence_at_threshold_is_not_silent():
    # RMS of a constant array equals its magnitude; exactly == threshold ⇒ not silent (strict <).
    arr = np.full(1600, 0.008, dtype=np.float32)
    assert is_silence(arr, 0.008) is False


# --- keep_segment (gate b) ---------------------------------------------------

def test_keep_segment_all_pass():
    assert keep_segment(0.1, -0.3, 1.5) is True


def test_keep_segment_no_speech_prob_boundary():
    assert keep_segment(0.60, -0.3, 1.5) is True
    assert keep_segment(0.61, -0.3, 1.5) is False


def test_keep_segment_avg_logprob_boundary():
    assert keep_segment(0.1, -1.00, 1.5) is True
    assert keep_segment(0.1, -1.01, 1.5) is False


def test_keep_segment_compression_ratio_boundary():
    assert keep_segment(0.1, -0.3, 2.40) is True
    assert keep_segment(0.1, -0.3, 2.41) is False


def test_keep_segment_drops_silence_credit_hallucination():
    # High no_speech_prob — classic "Sous-titrage…" on room tone.
    assert keep_segment(0.85, -0.2, 1.4) is False


def test_keep_segment_drops_repetition():
    assert keep_segment(0.1, -0.2, 3.0) is False


def test_keep_segment_custom_thresholds():
    assert keep_segment(0.7, -1.5, 2.6, no_speech_prob_max=0.8,
                        avg_logprob_min=-2.0, compression_ratio_max=3.0) is True


# --- segment_confidence ------------------------------------------------------

def test_segment_confidence_empty_is_none():
    assert segment_confidence([]) is None


def test_segment_confidence_single():
    assert segment_confidence([-0.1]) == pytest.approx(math.exp(-0.1))  # ~0.905


def test_segment_confidence_mean_of_exps():
    expected = (math.exp(-0.1) + math.exp(-0.7)) / 2
    assert segment_confidence([-0.1, -0.7]) == pytest.approx(expected)


def test_segment_confidence_clamps_positive_to_one():
    assert segment_confidence([0.5]) == 1.0


def test_segment_confidence_in_unit_range():
    c = segment_confidence([-2.0, -0.5, -1.0])
    assert 0.0 <= c <= 1.0


# --- decide_flush (gate c) ---------------------------------------------------

def test_decide_flush_no_regions_below_max_is_none():
    assert decide_flush([], 10_000, SR, 0, 12_000) is None


def test_decide_flush_no_regions_at_max_is_none():
    # No speech ⇒ nothing to emit even past the cap (caller idle-trims instead).
    assert decide_flush([], 200_000, SR, 0, 12_000) is None


def test_decide_flush_terminated_region_flushes_silence():
    regions = [{"start": 1600, "end": 32_000}]
    fd = decide_flush(regions, 48_000, SR, 0, 12_000)
    assert fd == FlushDecision(1600, 32_000, "silence")


def test_decide_flush_ongoing_region_is_none():
    # Last region end pinned to buffer end ⇒ trailing == 0 ⇒ still speaking.
    assert decide_flush([{"start": 1600, "end": 48_000}], 48_000, SR, 0, 12_000) is None


def test_decide_flush_ongoing_past_max_force_flushes():
    fd = decide_flush([{"start": 0, "end": 200_000}], 200_000, SR, 0, 12_000)
    assert fd == FlushDecision(0, 200_000, "max")


def test_decide_flush_hangover_boundary():
    hangover_ms = 300
    hangover_samples = hangover_ms * SR // 1000  # 4800
    total = 50_000
    end_at_threshold = total - hangover_samples           # trailing == hangover ⇒ flush
    end_below_threshold = total - (hangover_samples - 1)   # trailing == hangover-1 ⇒ none
    assert decide_flush([{"start": 0, "end": end_at_threshold}], total, SR,
                        hangover_ms, 12_000) == FlushDecision(0, end_at_threshold, "silence")
    assert decide_flush([{"start": 0, "end": end_below_threshold}], total, SR,
                        hangover_ms, 12_000) is None


def test_decide_flush_multi_region_spans_first_to_last():
    regions = [{"start": 1000, "end": 5000}, {"start": 8000, "end": 20_000}]
    fd = decide_flush(regions, 40_000, SR, 0, 12_000)
    assert fd == FlushDecision(1000, 20_000, "silence")


# --- span_to_ms --------------------------------------------------------------

def test_span_to_ms_basic_mapping():
    assert span_to_ms(0, 16_000, 0, SR) == (0, 1000)


def test_span_to_ms_applies_pending_offset():
    # pending starts 2s into the stream; a [0, 0.5s) span → [2000, 2500] ms.
    assert span_to_ms(0, 8000, 32_000, SR) == (2000, 2500)


def test_span_to_ms_is_monotonic():
    t0, t1 = span_to_ms(5000, 5001, 100, SR)
    assert t1 >= t0
