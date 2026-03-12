import json
import os
import random
import time
from pathlib import Path
from threading import Lock
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


def _get_env_int(name: str, default: int) -> int:
    value = _get_env(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


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


def _parse_bool(value: object) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "true":
            return True
        if normalized == "false":
            return False
    return None


def _parse_p1_state(value: object) -> Optional[str]:
    if isinstance(value, int):
        if value in (0, 1, 2):
            return str(value)
        return None
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if normalized in {"0", "1", "2"}:
        return normalized
    if normalized == "off":
        return "0"
    if normalized == "on":
        return "1"
    if normalized == "standby":
        return "2"
    return None


def main() -> None:
    _load_env()

    global SEC
    SEC = max(1, _get_env_int("TEST_PUBLISH_INTERVAL", SEC))
    host = _get_env("MQTT_BROKER_HOST", "localhost")
    port = int(_get_env("MQTT_BROKER_PORT", "1883") or "1883")
    username = _get_env("MQTT_USERNAME")
    password = _get_env("MQTT_PASSWORD")
    device_id = _get_env("TEST_DEVICE_ID")
    topic = _get_env("TEST_PUBLISH_TOPIC")
    customer = _get_env("TEST_CUSTOMER_NAME")
    receive_topic = f"{customer}/json/receive/{device_id}/" if customer and device_id else None

    state_lock = Lock()
    output_state = {
        "p100_stat": False,
        "p1_stat": "0",
    }
    pending_output = {
        "p100_stat": True,
        "p1_stat": True,
    }

    def handle_message(_client: mqtt.Client, _userdata: object, msg: mqtt.MQTTMessage) -> None:
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        if not isinstance(payload, dict):
            return

        p100_value = payload.get("p100_stat")
        p1_value = payload.get("p1_stat")

        next_p100 = _parse_bool(p100_value)
        next_p1 = _parse_p1_state(p1_value)

        with state_lock:
            if next_p100 is not None:
                output_state["p100_stat"] = next_p100
                pending_output["p100_stat"] = True
            if next_p1 is not None:
                output_state["p1_stat"] = next_p1
                pending_output["p1_stat"] = True

    client = mqtt.Client()
    if username and password:
        client.username_pw_set(username, password)
    client.on_message = handle_message

    client.connect(host, port, keepalive=60)
    if receive_topic:
        client.subscribe(receive_topic)
        print(f"Listening for state changes on {receive_topic}")
    client.loop_start()
    print(f"Publishing to {topic} every {SEC} Seconds. Ctrl+C to stop.")

    current_temp: Optional[int] = None
    try:
        while True:
            current_temp = _next_temp(current_temp)
            payload = _build_payload(current_temp, device_id)
            with state_lock:
                send_p100 = pending_output["p100_stat"]
                send_p1 = pending_output["p1_stat"]
                p100_value = output_state["p100_stat"]
                p1_value = output_state["p1_stat"]

            if send_p100:
                payload["p100_stat"] = p100_value
            if send_p1:
                payload["p1_stat"] = p1_value
            result = client.publish(topic, json.dumps(payload))
            result.wait_for_publish()
            if send_p100 or send_p1:
                with state_lock:
                    if send_p100:
                        pending_output["p100_stat"] = False
                    if send_p1:
                        pending_output["p1_stat"] = False
            time.sleep(SEC)
    except KeyboardInterrupt:
        print("Stopped publishing.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
