def build_segment(text, t0_ms, t1_ms, final, confidence=None):
    """Build a transcript-segment payload matching TranscriptSegmentSchema."""
    if t1_ms < t0_ms:
        raise ValueError("t1 must be >= t0")
    seg = {"text": text, "t0": int(t0_ms), "t1": int(t1_ms), "final": bool(final)}
    if confidence is not None:
        seg["confidence"] = float(confidence)
    return seg
