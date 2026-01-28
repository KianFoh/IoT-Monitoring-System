from typing import Any, Dict, List
from app.services.custom_processing.utils.error_handling import map_errors
from app.services.custom_processing.utils.convertion import map_value_to_text 

DEVICE_UID = "9C8B05455Z93333333"

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
    err_hex = data.pop("error_hex")
    error_list = map_errors(err_hex, ERROR_MESSAGES)
    data["pump_stat"] = map_value_to_text(data["pump_stat"], STATUS)
    data["water_level"] = map_value_to_text(data["water_level"], WATER_LEVEL)
    data["errors"] = error_list
    return data
