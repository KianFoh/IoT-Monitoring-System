import logging
from threading import RLock

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AlertRule

logger = logging.getLogger(__name__)


ALERT_RULE_SELECT = """
SELECT
    ar.id,
    ar.device_id,
    d.department_id,
    c.name AS customer_name,
    d.uid AS device_uid,
    d.name AS device_name,
    ar.name,
    ar.field,
    ar.field_label,
    ar.field_type,
    ar.operator,
    ar.value,
    ar.notification_method,
    ar.message,
    ar.include_data_in_message,
    ar.cooldown_seconds,
    ar.is_active
FROM alert_rule ar
JOIN device d ON d.id = ar.device_id
LEFT JOIN department dept ON dept.id = d.department_id
LEFT JOIN customer c ON c.id = dept.customer_id
WHERE ar.is_active = TRUE
"""


def _row_to_rule(row) -> AlertRule:
    data = row._mapping
    return AlertRule(
        id=int(data["id"]),
        device_id=int(data["device_id"]),
        department_id=int(data["department_id"]) if data["department_id"] is not None else None,
        customer_name=data["customer_name"],
        device_uid=data["device_uid"],
        device_name=data["device_name"],
        name=data["name"],
        field=data["field"],
        field_label=data["field_label"],
        field_type=data["field_type"],
        operator=data["operator"],
        value=data["value"],
        notification_method=data["notification_method"],
        message=data["message"],
        include_data_in_message=bool(data["include_data_in_message"]),
        cooldown_seconds=int(data["cooldown_seconds"] or 0),
        is_active=bool(data["is_active"]),
    )


class AlertRuleStore:
    def __init__(self) -> None:
        self._lock = RLock()
        self._rules_by_device_id: dict[int, list[AlertRule]] = {}
        self._device_id_by_uid: dict[str, int] = {}

    def load_all(self) -> None:
        with SessionLocal() as db:
            rules = [_row_to_rule(row) for row in db.execute(text(ALERT_RULE_SELECT))]

        next_rules: dict[int, list[AlertRule]] = {}
        for rule in rules:
            next_rules.setdefault(rule.device_id, []).append(rule)

        with self._lock:
            self._rules_by_device_id = next_rules
            self._device_id_by_uid = {rule.device_uid: rule.device_id for rule in rules}

        logger.info("Loaded %s active alert rules across %s devices", len(rules), len(next_rules))

    def reload_device(self, device_id: int) -> None:
        with SessionLocal() as db:
            rules = self._load_device_rules(db, device_id)

        with self._lock:
            old_rules = self._rules_by_device_id.pop(device_id, [])
            for old_rule in old_rules:
                if self._device_id_by_uid.get(old_rule.device_uid) == device_id:
                    self._device_id_by_uid.pop(old_rule.device_uid, None)

            if rules:
                self._rules_by_device_id[device_id] = rules
                self._device_id_by_uid[rules[0].device_uid] = device_id

        logger.info("Reloaded %s active alert rules for device_id=%s", len(rules), device_id)

    def get_rules_for_uid(self, uid: str) -> list[AlertRule]:
        with self._lock:
            device_id = self._device_id_by_uid.get(uid)
            if device_id is None:
                return []
            return list(self._rules_by_device_id.get(device_id, []))

    def _load_device_rules(self, db: Session, device_id: int) -> list[AlertRule]:
        rows = db.execute(
            text(f"{ALERT_RULE_SELECT} AND ar.device_id = :device_id"),
            {"device_id": device_id},
        )
        return [_row_to_rule(row) for row in rows]
