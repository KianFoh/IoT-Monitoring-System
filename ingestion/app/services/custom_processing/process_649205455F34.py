from typing import Any, Dict, List
from app.services.custom_processing.utils.error_handling import map_errors
from app.services.custom_processing.utils.convertion import map_value_to_text 

DEVICE_UIDS = ["649205455F34", "2C8B05455F344444"]

ERROR_MESSAGES: List[str] = [
    "PROD COND OVER LIMIT",
    "FEED COND OVER LIMIT",
    "REJ FLOW OVER LIMIT",
    "PROD FLOW OVER LIMIT",
    "SALT REJ OVER LIMIT",
    "TANK LEVEL MEDIUM",
    "TANK LEVEL LOW",
    "PPM SCHEDULE DUE",
    "GUARD FILTER DUE",
    "MEMBRANE FILTER DUE",
    "PRE TREATMENT DUE",
    "RO-PUMP LOW-PRESSURE",
]

STATUS: Dict[int, str] = {
    0: "off",
    1: "on",
    2: "standby",
}

WATER_LEVEL: Dict[int, str] = {
    0: "low",
    1: "medium",
    2: "high",
}

def process(data: Dict[str, Any]) -> Dict[str, Any]:
    error_hex = data.get("error_hex")
    if error_hex:
        error_list = map_errors(error_hex, ERROR_MESSAGES)
        data["errors"] = error_list
        data.pop("error_hex", None)  # safe delete

    if data.get("p1_stat") is not None:
        data["p1_stat"] = map_value_to_text(data.get("p1_stat"), STATUS)

    if data.get("p2_stat") is not None:
        data["p2_stat"] = map_value_to_text(data.get("p2_stat"), STATUS)

    if data.get("ro_stat") is not None:
        data["ro_stat"] = map_value_to_text(data.get("ro_stat"), STATUS)

    if data.get("schedule") is not None:
        data["schedule"] = map_value_to_text(data.get("schedule"), STATUS)

    if data.get("auto_flush") is not None:
        data["auto_flush"] = map_value_to_text(data.get("auto_flush"), STATUS)

    if data.get("tank_level") is not None:
        data["tank_level"] = map_value_to_text(data.get("tank_level"), WATER_LEVEL)

    if data.get("ivt_stat") is not None:
        data["ivt_stat"] = map_value_to_text(data.get("ivt_stat"), STATUS)
    return data