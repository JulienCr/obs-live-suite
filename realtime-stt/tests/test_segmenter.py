from stt.segmenter import build_segment

def test_build_segment_shape():
    seg = build_segment("le spectacle", 1000, 2500, True, 0.9)
    assert seg == {"text": "le spectacle", "t0": 1000, "t1": 2500, "final": True, "confidence": 0.9}

def test_build_segment_omits_confidence_when_none():
    seg = build_segment("x", 0, 100, False)
    assert "confidence" not in seg
    assert seg["final"] is False

def test_build_segment_rejects_backwards_window():
    import pytest
    with pytest.raises(ValueError):
        build_segment("x", 5000, 1000, True)
