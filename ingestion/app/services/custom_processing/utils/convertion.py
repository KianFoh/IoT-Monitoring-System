from collections.abc import Mapping
from typing import Any

def hex_to_binary(hex_str: str) -> str:
    if hex_str is None:
        return None
    return format(int(hex_str, 16), f"0{len(hex_str) * 4}b")

def map_value_to_text(value: Any, mapping: Mapping[int, str]) -> str | None:
    try:
        key = int(value)
    except (TypeError, ValueError):
        return None
    return mapping.get(key)

def to_float_or_none(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return float(stripped)
        except ValueError:
            return None
    return None

def to_int_or_none(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(stripped)
        except ValueError:
            return None
    return None

def to_bool_or_none(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "true":
            return True
        if normalized == "false":
            return False
    return None
