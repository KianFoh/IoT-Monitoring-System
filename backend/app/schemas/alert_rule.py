from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enum.alert_rule import AlertFieldType, AlertOperator


ALERT_OPERATORS_BY_FIELD_TYPE: dict[AlertFieldType, set[AlertOperator]] = {
    AlertFieldType.text: {
        AlertOperator.eq,
        AlertOperator.ne,
        AlertOperator.in_,
        AlertOperator.not_in,
    },
    AlertFieldType.number: {
        AlertOperator.eq,
        AlertOperator.lt,
        AlertOperator.gt,
        AlertOperator.lte,
        AlertOperator.gte,
    },
    AlertFieldType.boolean: {
        AlertOperator.eq,
        AlertOperator.ne,
    },
    AlertFieldType.list: {
        AlertOperator.contains,
        AlertOperator.not_contains,
        AlertOperator.contains_any,
        AlertOperator.contains_all,
        AlertOperator.is_empty,
    },
}


class AlertRuleBase(BaseModel):
    name: str
    device_id: int
    field: str
    field_label: Optional[str] = None
    field_type: AlertFieldType
    operator: AlertOperator
    value: Optional[Any] = None
    notification_method: str
    message: Optional[str] = None
    include_data_in_message: bool = True
    cooldown_seconds: int = 300
    is_active: bool = True

    @model_validator(mode="after")
    def validate_operator_for_field_type(self):
        allowed = ALERT_OPERATORS_BY_FIELD_TYPE[self.field_type]
        if self.operator not in allowed:
            raise ValueError(f"Operator {self.operator.value!r} is not valid for {self.field_type.value}.")
        if self.cooldown_seconds < 0:
            raise ValueError("cooldown_seconds must be greater than or equal to 0.")
        return self


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    field: Optional[str] = None
    field_label: Optional[str] = None
    field_type: Optional[AlertFieldType] = None
    operator: Optional[AlertOperator] = None
    value: Optional[Any] = None
    notification_method: Optional[str] = None
    message: Optional[str] = None
    include_data_in_message: Optional[bool] = None
    cooldown_seconds: Optional[int] = None
    is_active: Optional[bool] = None


class AlertRuleOut(AlertRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlertRuleListResponse(BaseModel):
    items: list[AlertRuleOut]
    total: int
    page: int
    page_size: int
