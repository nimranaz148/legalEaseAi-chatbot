"""
Pluggable OCR Provider interface and implementations: Gemini Vision & Pytesseract.
"""
import io
import logging
from core.config import get_settings
from core.llm import get_genai_client, call_with_retry

logger = logging.getLogger(__name__)

OCR_PROMPT = (
    "Transcribe all text from this statutory document page exactly as written. "
    "Do not summarize, paraphrase, or omit anything. "
    "Preserve exact section numbers, headings, punctuation, and formatting."
)


def ocr_gemini_vision(image_bytes: bytes, mime_type: str = "") -> str:
    """Transcribes page image using Gemini Vision with automatic MIME detection."""
    settings = get_settings()
    client = get_genai_client()

    if not mime_type:
        if image_bytes.startswith(b"\xff\xd8"):
            mime_type = "image/jpeg"
        elif image_bytes.startswith(b"\x89PNG"):
            mime_type = "image/png"
        elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
            mime_type = "image/webp"
        else:
            mime_type = "image/png"

    def _call():
        if hasattr(client, "models") and hasattr(client.models, "generate_content"):
            from google.genai import types
            part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            resp = client.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=[part, OCR_PROMPT]
            )
            return resp.text or ""
        else:
            from PIL import Image
            import google.generativeai as genai_mod
            img = Image.open(io.BytesIO(image_bytes))
            model = genai_mod.GenerativeModel(model_name=settings.GEMINI_LLM_MODEL)
            resp = model.generate_content([OCR_PROMPT, img])
            return resp.text or ""

    return call_with_retry(_call)


def ocr_pytesseract(image_bytes: bytes) -> str:
    """Transcribes page image using local Tesseract binary."""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(img)
    except Exception as e:
        raise RuntimeError(
            f"Pytesseract failed: {e}. Ensure Tesseract-OCR is installed on Windows "
            "and added to PATH, or switch OCR_PROVIDER=gemini_vision in .env."
        )


def transcribe_page_image(image_bytes: bytes, provider: str = "") -> str:
    """Dispatch OCR to configured or requested provider."""
    settings = get_settings()
    prov = (provider or settings.OCR_PROVIDER).lower()

    if prov == "gemini_vision":
        return ocr_gemini_vision(image_bytes)
    elif prov == "pytesseract":
        return ocr_pytesseract(image_bytes)
    else:
        raise ValueError(f"Unknown OCR provider '{prov}'. Valid: 'gemini_vision', 'pytesseract'")
