import json
import os
import random
import time
from pathlib import Path
from typing import Optional

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

SEC = 1
TEMP_MIN = -20
TEMP_MAX = 100
TEMP_STEP_LIMIT = 50
SCHEDULE_VALUES = ["0", "1", "2"]
ERROR_HEX_MAX = 0xFFF


def _load_env() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    env_path = repo_root / ".env"
    load_dotenv(env_path)


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value


def _next_temp(prev: Optional[int]) -> int:
    if prev is None:
        return random.randint(TEMP_MIN, TEMP_MAX)
    lower = max(TEMP_MIN, prev - TEMP_STEP_LIMIT)
    upper = min(TEMP_MAX, prev + TEMP_STEP_LIMIT)
    return random.randint(lower, upper)


def _build_payload(temp_value: int, device_id: str) -> dict:
    schedule_value = random.choice(SCHEDULE_VALUES)
    error_hex_value = f"{random.randint(0, ERROR_HEX_MAX):03X}"
    return {
        "device_id": device_id,
        "temp": str(temp_value),
        "schedule": schedule_value,
        "error_hex": error_hex_value,
    }


def main() -> None:
    _load_env()

    host = _get_env("MQTT_BROKER_HOST", "localhost")
    port = int(_get_env("MQTT_BROKER_PORT", "1883") or "1883")
    username = _get_env("MQTT_USERNAME")
    password = _get_env("MQTT_PASSWORD")
    device_id = _get_env("TEST_DEVICE_ID")
    topic = (
        _get_env("TEST_PUBLISH_TOPIC")
    )

    client = mqtt.Client()
    if username and password:
        client.username_pw_set(username, password)

    client.connect(host, port, keepalive=60)
    print(f"Publishing to {topic} every {SEC} Seconds. Ctrl+C to stop.")

    current_temp: Optional[int] = None
    try:
        while True:
            current_temp = _next_temp(current_temp)
            payload = _build_payload(current_temp, device_id)
            result = client.publish(topic, json.dumps(payload))
            result.wait_for_publish()
            time.sleep(SEC)
    except KeyboardInterrupt:
        print("Stopped publishing.")
    finally:
        client.disconnect()


if __name__ == "__main__":
    main()
