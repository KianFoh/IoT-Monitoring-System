
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