from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AlertRule:
    id: int
    device_id: int
    department_id: int | None
    device_uid: str
    device_name: str
    name: str
    field: str
    field_label: str | None
    field_type: str
    operator: str
    value: Any
    notification_method: str
    message: str | None
    include_data_in_message: bool
    cooldown_seconds: int
    is_active: bool


@dataclass(frozen=True)
class AlertContext:
    rule: AlertRule
    actual_value: Any
    payload: dict[str, Any]
