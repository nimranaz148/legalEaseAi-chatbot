"""
Integration and contract tests for Google Gemini API Client (core/llm.py) - I-001.
Verifies embedding generation contract, retry/backoff mechanism, and prompt handling.
"""
import pytest
import numpy as np
from core.llm import embed_texts, call_with_retry, generate_text


def test_embed_texts_contract():
    """Verify embeddings are 768-dimensional, float32, and L2 normalized."""
    texts = [
        "What is consideration under contract law?",
        "An agreement enforceable by law is a contract."
    ]
    vectors = embed_texts(texts, task_type="RETRIEVAL_DOCUMENT")

    assert isinstance(vectors, np.ndarray)
    assert vectors.shape == (2, 768)
    assert vectors.dtype == np.float32

    # L2 norm should be approximately 1.0
    norms = np.linalg.norm(vectors, axis=1)
    for n in norms:
        assert np.isclose(n, 1.0, atol=1e-3)


def test_retry_with_backoff_success():
    """Verify call_with_retry executes successful function on first attempt."""
    calls = []

    def mock_op():
        calls.append(1)
        return "ok"

    result = call_with_retry(mock_op, max_retries=3, initial_delay=0.01)
    assert result == "ok"
    assert len(calls) == 1


def test_retry_with_backoff_recoverable_failure():
    """Verify call_with_retry retries on simulated transient 429 quota exhaustion."""
    attempts = 0

    class Mock429Exception(Exception):
        pass

    def flaky_op():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise Mock429Exception("429 ResourceExhausted: rate limit exceeded")
        return "success_after_retry"

    result = call_with_retry(flaky_op, max_retries=4, initial_delay=0.05)
    assert result == "success_after_retry"
    assert attempts == 3


def test_retry_with_backoff_exhaustion():
    """Verify call_with_retry raises exception if max retries are exceeded."""
    def always_fails():
        raise RuntimeError("Persistent network error")

    with pytest.raises(RuntimeError, match="Persistent network error"):
        call_with_retry(always_fails, max_retries=2, initial_delay=0.01)
