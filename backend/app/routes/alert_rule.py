from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import alert_rule as alert_rule_crud
from app.crud.postgres import device as device_crud
from app.models.alert_rule import AlertRule as AlertRuleModel
from app.models.enum.alert_rule import AlertFieldType, AlertOperator
from app.models.enum.user_role import UserRole
from app.models.user import User as UserModel
from app.schemas.alert_rule import (
    AlertRuleCreate,
    AlertRuleListResponse,
    AlertRuleOut,
    AlertRuleUpdate,
)
from app.utils.device_events import publish_device_alert


router = APIRouter(prefix="/alert-rules", tags=["alert-rules"])


def _require_superuser(current_user: UserModel) -> None:
    require_role(current_user, [UserRole.superuser])


def _get_device_context(db: Session, device_id: int):
    device = device_crud.get_device_with_relations(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )
    return device


def _ensure_device_exists(db: Session, device_id: int) -> None:
    _get_device_context(db, device_id)


def _publish_alert_rule_event(request: Request, device, action: str) -> None:
    publish_device_alert(
        request,
        device.customer_mqtt_topic,
        device.department_name,
        {
            "device_id": device.id,
            "uid": device.uid,
            "customer_name": device.customer_name,
            "customer_mqtt_topic": device.customer_mqtt_topic,
            "action": action,
        },
        device.distributor_name,
    )


def _validate_updated_rule(existing: AlertRuleModel, update: AlertRuleUpdate) -> None:
    data = {
        "name": existing.name,
        "device_id": existing.device_id,
        "field": existing.field,
        "field_label": existing.field_label,
        "field_type": AlertFieldType(existing.field_type),
        "operator": AlertOperator(existing.operator),
        "value": existing.value,
        "notification_method": existing.notification_method,
        "message": existing.message,
        "include_data_in_message": existing.include_data_in_message,
        "cooldown_seconds": existing.cooldown_seconds,
        "is_active": existing.is_active,
    }
    update_data = update.model_dump(exclude_unset=True)
    if "field_type" in update_data:
        update_data["field_type"] = update.field_type
    if "operator" in update_data:
        update_data["operator"] = update.operator
    data.update(update_data)
    AlertRuleCreate.model_validate(data)


@router.get("/", response_model=AlertRuleListResponse)
def list_alert_rules(
    search: str | None = Query(None, description="Search by rule, field, operator, method, or message"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    device_id: int | None = Query(None),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List alert rules."""
    _require_superuser(current_user)

    if device_id is not None:
        _ensure_device_exists(db, device_id)

    items, total = alert_rule_crud.get_alert_rules(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
        device_id=device_id,
    )
    return AlertRuleListResponse(
        items=[AlertRuleOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=AlertRuleOut, status_code=status.HTTP_201_CREATED)
def create_alert_rule(
    alert_rule: AlertRuleCreate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an alert rule."""
    _require_superuser(current_user)
    device = _get_device_context(db, alert_rule.device_id)
    created = alert_rule_crud.create_alert_rule(db, alert_rule)
    _publish_alert_rule_event(request, device, "add")
    return created


@router.get("/{alert_rule_id}", response_model=AlertRuleOut)
def get_alert_rule(
    alert_rule_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get an alert rule by ID."""
    _require_superuser(current_user)
    alert_rule = alert_rule_crud.get_alert_rule(db, alert_rule_id)
    if not alert_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert rule not found",
        )
    return alert_rule


@router.patch("/{alert_rule_id}", response_model=AlertRuleOut)
def update_alert_rule(
    alert_rule_id: int,
    alert_rule_update: AlertRuleUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an alert rule."""
    _require_superuser(current_user)
    existing = alert_rule_crud.get_alert_rule(db, alert_rule_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert rule not found",
        )
    _validate_updated_rule(existing, alert_rule_update)
    updated = alert_rule_crud.update_alert_rule(db, existing, alert_rule_update)
    device = _get_device_context(db, updated.device_id)
    _publish_alert_rule_event(request, device, "update")
    return updated


@router.delete("/{alert_rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert_rule(
    alert_rule_id: int,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an alert rule."""
    _require_superuser(current_user)
    existing = alert_rule_crud.get_alert_rule(db, alert_rule_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert rule not found",
        )
    device = _get_device_context(db, existing.device_id)
    alert_rule_crud.delete_alert_rule(db, alert_rule_id)
    _publish_alert_rule_event(request, device, "delete")
