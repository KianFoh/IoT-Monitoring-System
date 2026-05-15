from typing import Any, List, Mapping, Sequence
from app.services.custom_processing.utils.convertion import hex_to_binary

def map_errors(hex: str, mapping: Sequence[str] | Mapping[int, str]) -> List[str]:
    """Map binary error representation to human-readable messages."""
    binary = hex_to_binary(hex)

    if isinstance(mapping, Mapping):
        max_index = max(mapping.keys(), default=-1)
        ordered = [mapping.get(idx, "") for idx in range(max_index + 1)]
    else:
        ordered = list(mapping)

    limit = min(len(binary), len(ordered))
    results: List[str] = []
    for idx in range(limit):
        if binary[idx] == "1":
            message = ordered[idx]
            if message:
                results.append(message)
    return results

def active_error_indexes(value: Any, bit_count: int = 12) -> List[int] | None:
    if value is None:
        return None

    try:
        binary = hex_to_binary(str(value).strip())
    except (TypeError, ValueError):
        return None

    if not binary:
        return None

    padded = binary.zfill(bit_count)[-bit_count:]
    return [index for index, bit in enumerate(padded) if bit == "1"]
