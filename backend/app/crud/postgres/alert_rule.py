from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.alert_rule import AlertRule as AlertRuleModel
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleUpdate


def _enum_value(value):
    return getattr(value, "value", value)


def _create_data(alert_rule: AlertRuleCreate) -> dict:
    data = alert_rule.model_dump()
    data["field_type"] = _enum_value(alert_rule.field_type)
    data["operator"] = _enum_value(alert_rule.operator)
    return data


def _update_data(alert_rule_update: AlertRuleUpdate) -> dict:
    data = alert_rule_update.model_dump(exclude_unset=True)
    if "field_type" in data:
        data["field_type"] = _enum_value(alert_rule_update.field_type)
    if "operator" in data:
        data["operator"] = _enum_value(alert_rule_update.operator)
    return data


def create_alert_rule(db: Session, alert_rule: AlertRuleCreate) -> AlertRuleModel:
    db_alert_rule = AlertRuleModel(**_create_data(alert_rule))
    db.add(db_alert_rule)
    db.commit()
    db.refresh(db_alert_rule)
    return db_alert_rule


def get_alert_rule(db: Session, alert_rule_id: int) -> Optional[AlertRuleModel]:
    return db.query(AlertRuleModel).filter(AlertRuleModel.id == alert_rule_id).first()


def get_alert_rules(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    device_id: Optional[int] = None,
):
    query = db.query(AlertRuleModel)

    if device_id is not None:
        query = query.filter(AlertRuleModel.device_id == device_id)

    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(AlertRuleModel.name).like(like),
                func.lower(AlertRuleModel.field).like(like),
                func.lower(AlertRuleModel.field_label).like(like),
                func.lower(AlertRuleModel.field_type).like(like),
                func.lower(AlertRuleModel.operator).like(like),
                func.lower(AlertRuleModel.notification_method).like(like),
                func.lower(AlertRuleModel.message).like(like),
            )
        )

    total = query.count()
    items = (
        query.order_by(AlertRuleModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def update_alert_rule(
    db: Session,
    db_alert_rule: AlertRuleModel,
    alert_rule_update: AlertRuleUpdate,
) -> AlertRuleModel:
    update_data = _update_data(alert_rule_update)
    for field, value in update_data.items():
        setattr(db_alert_rule, field, value)
    db.commit()
    db.refresh(db_alert_rule)
    return db_alert_rule


def delete_alert_rule(db: Session, alert_rule_id: int) -> bool:
    db_alert_rule = get_alert_rule(db, alert_rule_id)
    if not db_alert_rule:
        return False
    db.delete(db_alert_rule)
    db.commit()
    return True
