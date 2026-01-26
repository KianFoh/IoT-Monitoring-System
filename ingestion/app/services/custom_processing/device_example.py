from typing import Any, Dict

DEVICE_UID = "2C8B05455F34"

def process(data: Dict[str, Any]) -> Dict[str, Any]:
    # Example custom processing logic
    data["ac_amp"] = 123.45 # Simulated processed value
    return data 