from pathlib import Path
from typing import Optional
import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict
from core.schema import LawConfig


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_LLM_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBED_MODEL: str = "gemini-embedding-001"
    EMBED_DIM: int = 768
    QDRANT_PATH: str = "qdrant_data"
    COLLECTION_NAME: str = "legal_docs"
    API_URL: str = "http://127.0.0.1:8000"
    TOP_K: int = 5
    MIN_SCORE: float = 0.45
    OCR_PROVIDER: str = "gemini_vision"
    DISCLAIMER_TEXT: str = "Yeh sirf maloomati hai, qanooni mashwara nahi. This is general information, not legal advice."
    NO_DATA_TEXT: str = "Is bare mein mere paas data nahi hai. I do not have data on this in the loaded laws."

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def load_laws(yaml_path: str = "laws.yaml") -> dict[str, LawConfig]:
    path = Path(yaml_path)
    if not path.is_file():
        raise FileNotFoundError(f"Law registry configuration file not found: {yaml_path}")

    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not isinstance(data, dict):
        raise ValueError(f"Invalid format in {yaml_path}: expected root mapping of law definitions.")

    laws: dict[str, LawConfig] = {}
    errors: list[str] = []

    for law_id, raw_cfg in data.items():
        if not isinstance(raw_cfg, dict):
            errors.append(f"Law '{law_id}' definition must be a dictionary.")
            continue
        try:
            laws[law_id] = LawConfig(**raw_cfg)
        except Exception as e:
            errors.append(f"Validation failed for law '{law_id}': {e}")

    if errors:
        raise ValueError("Configuration errors found in law registry:\n" + "\n".join(f" - {err}" for err in errors))

    return laws


def get_enabled_laws(yaml_path: str = "laws.yaml") -> dict[str, LawConfig]:
    all_laws = load_laws(yaml_path)
    return {law_id: cfg for law_id, cfg in all_laws.items() if cfg.enabled}
