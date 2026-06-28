"""Pytest root marker for the realtime-stt package.

Its presence makes pytest treat this directory as the import root (added to
sys.path in the default `prepend` import mode), so tests can `from stt.gates
import ...` whether they're run as `pytest` or `python -m pytest` from here.
"""
