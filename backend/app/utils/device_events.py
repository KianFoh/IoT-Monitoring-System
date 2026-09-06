from fastapi import Request

DEVICE_EVENT_PREFIX = "internal/devices/events"
DEVICE_ALERT_PREFIX = "internal/devices/alert"


def normalize_topic_name(value: str | None) -> str:
    return (value or "").strip().lower()


def build_device_event_topic(
    customer_name: str,
    department_name: str,
    device_uid: str,
    distributor_name: str | None = None,
) -> str:
    normalized_customer = normalize_topic_name(customer_name)
    normalized_department = normalize_topic_name(department_name)
    normalized_distributor = normalize_topic_name(distributor_name) if distributor_name else ""
    if normalized_distributor:
        return f"{DEVICE_EVENT_PREFIX}/{normalized_distributor}/{normalized_customer}/{normalized_department}/{device_uid}/"
    return f"{DEVICE_EVENT_PREFIX}/{normalized_customer}/{normalized_department}/{device_uid}/"


def build_device_alert_topic(
    customer_name: str,
    department_name: str,
    device_uid: str,
    distributor_name: str | None = None,
) -> str:
    normalized_customer = normalize_topic_name(customer_name)
    normalized_department = normalize_topic_name(department_name)
    normalized_distributor = normalize_topic_name(distributor_name) if distributor_name else ""
    if normalized_distributor:
        return f"{DEVICE_ALERT_PREFIX}/{normalized_distributor}/{normalized_customer}/{normalized_department}/{device_uid}/"
    return f"{DEVICE_ALERT_PREFIX}/{normalized_customer}/{normalized_department}/{device_uid}/"


def publish_device_event(
    request: Request,
    customer_name: str,
    department_name: str,
    payload: dict,
    distributor_name: str | None = None,
) -> None:
    mqtt_client = getattr(request.app.state, "mqtt_client", None)
    if not mqtt_client:
        return
    payload_to_send = dict(payload)
    normalized_customer = normalize_topic_name(customer_name)
    normalized_department = normalize_topic_name(department_name)
    payload_to_send.setdefault("customer_mqtt_topic", normalized_customer)
    payload_to_send.setdefault("customer_name", normalized_customer)
    payload_to_send.setdefault("department_mqtt_topic", normalized_department)
    payload_to_send.setdefault("department_name", normalized_department)
    if distributor_name:
        normalized_distributor = normalize_topic_name(distributor_name)
        payload_to_send.setdefault("distributor_mqtt_topic", normalized_distributor)
        payload_to_send.setdefault("distributor_name", normalized_distributor)
    mqtt_client.publish(
        build_device_event_topic(
            normalized_customer,
            normalized_department,
            payload_to_send.get("uid"),
            distributor_name,
        ),
        payload_to_send,
    )


def publish_device_alert(
    request: Request,
    customer_name: str,
    department_name: str,
    payload: dict,
    distributor_name: str | None = None,
) -> None:
    mqtt_client = getattr(request.app.state, "mqtt_client", None)
    if not mqtt_client:
        return
    payload_to_send = dict(payload)
    normalized_customer = normalize_topic_name(customer_name)
    normalized_department = normalize_topic_name(department_name)
    payload_to_send.setdefault("customer_mqtt_topic", normalized_customer)
    payload_to_send.setdefault("customer_name", normalized_customer)
    payload_to_send.setdefault("department_mqtt_topic", normalized_department)
    payload_to_send.setdefault("department_name", normalized_department)
    if distributor_name:
        normalized_distributor = normalize_topic_name(distributor_name)
        payload_to_send.setdefault("distributor_mqtt_topic", normalized_distributor)
        payload_to_send.setdefault("distributor_name", normalized_distributor)
    mqtt_client.publish(
        build_device_alert_topic(
            normalized_customer,
            normalized_department,
            payload_to_send.get("uid"),
            distributor_name,
        ),
        payload_to_send,
    )
