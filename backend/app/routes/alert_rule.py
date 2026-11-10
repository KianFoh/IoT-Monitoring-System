from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import alert_rule as alert_rule_crud
from app.crud.postgres import device as device_crud
from app.crud.postgres import user as user_crud
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


def _get_device_context(db: Session, device_id: int):
    device = device_crud.get_device(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )
    return device


def _ensure_user_can_access_device(db: Session, current_user: UserModel, device) -> None:
    if current_user.role == UserRole.user and not user_crud.user_has_department(
        db, current_user.id, device.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this device's alert rules",
        )


def _get_accessible_alert_rule(db: Session, alert_rule_id: int, current_user: UserModel):
    alert_rule = alert_rule_crud.get_alert_rule(db, alert_rule_id)
    if not alert_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert rule not found",
        )
    device = _get_device_context(db, alert_rule.device_id)
    _ensure_user_can_access_device(db, current_user, device)
    return alert_rule, device_crud.get_device_with_relations(db, device.id)


def _publish_alert_rule_event(request: Request, device, action: str) -> None:
    publish_device_alert(
        request,
        device.customer_mqtt_topic,
        device.department_mqtt_topic,
        {
            "device_id": device.id,
            "uid": device.uid,
            "customer_name": device.customer_name,
            "customer_mqtt_topic": device.customer_mqtt_topic,
            "distributor_name": device.distributor_name,
            "distributor_mqtt_topic": device.distributor_mqtt_topic,
            "department_name": device.department_name,
            "department_mqtt_topic": device.department_mqtt_topic,
            "action": action,
        },
        device.distributor_mqtt_topic or device.distributor_name,
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
    require_role(current_user, [UserRole.superuser, UserRole.user])

    department_ids = None
    if device_id is not None:
        device = _get_device_context(db, device_id)
        _ensure_user_can_access_device(db, current_user, device)
    elif current_user.role == UserRole.user:
        department_ids = user_crud.get_user_department_ids(db, current_user.id)
        if not department_ids:
            return AlertRuleListResponse(items=[], total=0, page=page, page_size=page_size)

    items, total = alert_rule_crud.get_alert_rules(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
        device_id=device_id,
        department_ids=department_ids,
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
    require_role(current_user, [UserRole.superuser, UserRole.user])
    device = _get_device_context(db, alert_rule.device_id)
    _ensure_user_can_access_device(db, current_user, device)
    created = alert_rule_crud.create_alert_rule(db, alert_rule)
    _publish_alert_rule_event(request, device_crud.get_device_with_relations(db, device.id), "add")
    return created


@router.get("/{alert_rule_id}", response_model=AlertRuleOut)
def get_alert_rule(
    alert_rule_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get an alert rule by ID."""
    require_role(current_user, [UserRole.superuser, UserRole.user])
    alert_rule, _ = _get_accessible_alert_rule(db, alert_rule_id, current_user)
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
    require_role(current_user, [UserRole.superuser, UserRole.user])
    existing, device = _get_accessible_alert_rule(db, alert_rule_id, current_user)
    _validate_updated_rule(existing, alert_rule_update)
    update_data = alert_rule_update.model_dump(exclude_unset=True)
    if current_user.role == UserRole.user and "device_id" in update_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot move alert rules to another device",
        )
    updated = alert_rule_crud.update_alert_rule(db, existing, alert_rule_update)
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
    require_role(current_user, [UserRole.superuser, UserRole.user])
    _, device = _get_accessible_alert_rule(db, alert_rule_id, current_user)
    alert_rule_crud.delete_alert_rule(db, alert_rule_id)
    _publish_alert_rule_event(request, device, "delete")
