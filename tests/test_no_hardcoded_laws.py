"""
Architectural Guardrail Test:
Enforces zero law hardcoding across core/, api/, ui/.
Fails if any law name, short name from laws.yaml or known statute phrases appear in source code.
"""
from pathlib import Path
import pytest
from core.config import load_laws


def get_forbidden_phrases() -> set[str]:
    laws = load_laws("laws.yaml")
    phrases = set()
    for law_id, cfg in laws.items():
        if cfg.name:
            phrases.add(cfg.name.lower())
        if cfg.full_name:
            phrases.add(cfg.full_name.lower())
        if cfg.short:
            phrases.add(cfg.short.lower())
    # Additional common literal patterns that must never be hardcoded
    phrases.update(["contract act", "penal code", "crpc", "civil procedure"])
    return phrases


def test_zero_hardcoded_laws():
    forbidden = get_forbidden_phrases()
    target_dirs = ["core", "api", "ui"]
    violations = []

    for d in target_dirs:
        dir_path = Path(d)
        if not dir_path.is_dir():
            continue
        for py_file in dir_path.rglob("*.py"):
            text = py_file.read_text(encoding="utf-8").lower()
            for phrase in forbidden:
                if phrase in text:
                    violations.append(f"{py_file}: contains forbidden statute phrase '{phrase}'")

    assert not violations, "Law-agnostic architecture violation detected:\n" + "\n".join(violations)
