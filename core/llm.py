"""
Gemini API client wrapper for embedding generation, text completion, and vision OCR.
Implements exponential backoff on HTTP 429 rate limit responses.
"""
import logging
import os
import re
import hashlib
import time
from typing import Optional
import numpy as np
from core.config import get_settings

logger = logging.getLogger(__name__)


def get_genai_client():
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured. Set it in .env or environment.")

    # Try importing google.genai
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except ImportError:
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            return legacy_genai
        except ImportError:
            raise ImportError("Neither 'google-genai' nor 'google-generativeai' package is installed.")


def call_with_retry(fn, max_retries: int = 3, initial_delay: float = 2.0, max_sleep: float = 12.0):
    """Executes a callable with exponential backoff on rate limits."""
    delay = initial_delay
    last_exc = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str:
                # If Google gave a specific retry delay (e.g., "retry in 22s"), respect it up to max_sleep
                retry_match = re.search(r"retry in (\d+(?:\.\d+)?)s", err_str)
                suggested = float(retry_match.group(1)) + 1.0 if retry_match else delay
                if suggested > max_sleep and attempt >= 1:
                    logger.warning("Rate limit wait time (%.1fs) exceeds max_sleep (%.1fs). Raising for fallback.", suggested, max_sleep)
                    raise e
                sleep_time = min(suggested, max_sleep)
                logger.warning("Gemini rate limit encountered. Retrying in %.1fs (attempt %d/%d)...", sleep_time, attempt + 1, max_retries)
                time.sleep(sleep_time)
                delay = min(delay * 2.0, max_sleep)
            else:
                raise e
    raise last_exc


def _generate_deterministic_embeddings(texts: list[str]) -> np.ndarray:
    """Produce deterministic 768-dim pseudo-vectors using weighted hashing for fallback/offline testing."""
    settings = get_settings()
    stopwords = {
        "what", "is", "in", "the", "of", "to", "by", "a", "an", "under", "for",
        "are", "who", "which", "and", "or", "as", "be", "this", "it", "with",
        "law", "act", "contract", "defined", "section", "according"
    }
    arr = np.zeros((len(texts), settings.EMBED_DIM), dtype=np.float32)
    for idx, t in enumerate(texts):
        words = re.findall(r"\w+", t.lower())
        for w in words:
            h = int.from_bytes(hashlib.md5(w.encode("utf-8")).digest()[:4], "little") % settings.EMBED_DIM
            weight = 0.2 if w in stopwords else 2.5
            arr[idx, h] += weight
            if w.isdigit():
                h_num = int.from_bytes(hashlib.md5(f"sec_{w}".encode("utf-8")).digest()[:4], "little") % settings.EMBED_DIM
                arr[idx, h_num] += 4.0
        first_line = t.split("\n")[0]
        for w in re.findall(r"\w+", first_line.lower()):
            if w not in stopwords:
                h_t = int.from_bytes(hashlib.md5(w.encode("utf-8")).digest()[:4], "little") % settings.EMBED_DIM
                arr[idx, h_t] += 3.0
        for i in range(len(t) - 3):
            gram = t[i:i + 4].lower().strip()
            if gram:
                h_g = int.from_bytes(hashlib.md5(gram.encode("utf-8")).digest()[:4], "little") % settings.EMBED_DIM
                arr[idx, h_g] += 0.2
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def embed_texts(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> np.ndarray:
    """
    Generates 768-dimensional L2-normalized embeddings for a list of strings.
    task_type: 'RETRIEVAL_DOCUMENT' for indexing chunks, 'RETRIEVAL_QUERY' for user queries.
    Falls back gracefully to deterministic pseudo-embeddings if quota exceeded or offline.
    """
    if not texts:
        return np.empty((0, 768), dtype=np.float32)

    settings = get_settings()
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        logger.warning("GEMINI_API_KEY not configured. Generating deterministic fallback embeddings for testing.")
        return _generate_deterministic_embeddings(texts)

    try:
        client = get_genai_client()
        embeddings_list = []
        # Process in larger batches of 40 to minimize total API requests against 100 RPM quota
        batch_size = 40
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            if i > 0:
                time.sleep(0.3)  # Gentle throttle between batches

            def _embed_batch():
                if hasattr(client, "models") and hasattr(client.models, "embed_content"):
                    response = client.models.embed_content(
                        model=settings.GEMINI_EMBED_MODEL,
                        contents=batch,
                        config={
                            "output_dimensionality": settings.EMBED_DIM,
                            "task_type": task_type,
                        }
                    )
                    if hasattr(response, "embeddings"):
                        return [e.values for e in response.embeddings]
                    return [response.embedding.values]
                else:
                    import google.generativeai as genai_mod
                    res = genai_mod.embed_content(
                        model=f"models/{settings.GEMINI_EMBED_MODEL}",
                        content=batch,
                        task_type=task_type.lower()
                    )
                    return res["embedding"]

            batch_embeds = call_with_retry(_embed_batch)
            embeddings_list.extend(batch_embeds)

        arr = np.array(embeddings_list, dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return arr / norms
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str:
            logger.warning("Gemini embedding rate limit/quota reached (%s). Using deterministic semantic embeddings fallback.", e)
            return _generate_deterministic_embeddings(texts)
        raise e


def generate_text(prompt: str, system_instruction: Optional[str] = None, json_mode: bool = False) -> str:
    """Generates text from Gemini with optional system instructions and JSON mode."""
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        logger.warning("GEMINI_API_KEY not configured. Returning deterministic mock response.")
        if json_mode:
            return '{"found": false, "answer": "GEMINI_API_KEY is not set in .env. Please configure your Gemini API key to enable live AI responses.", "citations": []}'
        return "GEMINI_API_KEY is not set in .env. Please configure your API key."

    client = get_genai_client()

    def _call():
        if hasattr(client, "models") and hasattr(client.models, "generate_content"):
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction
            if json_mode:
                config["response_mime_type"] = "application/json"
            resp = client.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=prompt,
                config=config if config else None
            )
            return resp.text or ""
        else:
            import google.generativeai as genai_mod
            model = genai_mod.GenerativeModel(
                model_name=settings.GEMINI_LLM_MODEL,
                system_instruction=system_instruction
            )
            generation_config = {"response_mime_type": "application/json"} if json_mode else None
            resp = model.generate_content(prompt, generation_config=generation_config)
            return resp.text or ""

    return call_with_retry(_call)
