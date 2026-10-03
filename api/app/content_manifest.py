"""Helpers for validating lesson identifiers against generated content."""

import json
from pathlib import Path

from app.config import get_settings


def lesson_slug_exists(slug: str) -> bool:
    manifest_path = Path(get_settings().content_manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    return any(
        lesson["slug"] == slug for module in manifest["modules"] for lesson in module["lessons"]
    )
