from typing import Any

from app.models import AlertRule


def _as_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "true":
            return True
        if normalized == "false":
            return False
    return None


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _compare_text(actual: Any, operator: str, expected: Any) -> bool:
    actual_text = "" if actual is None else str(actual)
    expected_values = [str(item) for item in _as_list(expected)]
    expected_text = expected_values[0] if expected_values else ""

    if operator == "==":
        return actual_text == expected_text
    if operator == "!=":
        return actual_text != expected_text
    if operator == "in":
        return actual_text in expected_values
    if operator == "not in":
        return actual_text not in expected_values
    return False


def _compare_number(actual: Any, operator: str, expected: Any) -> bool:
    try:
        actual_number = float(actual)
        expected_number = float(expected)
    except (TypeError, ValueError):
        return False

    if operator == "==":
        return actual_number == expected_number
    if operator == "<":
        return actual_number < expected_number
    if operator == ">":
        return actual_number > expected_number
    if operator == "<=":
        return actual_number <= expected_number
    if operator == ">=":
        return actual_number >= expected_number
    return False


def _compare_boolean(actual: Any, operator: str, expected: Any) -> bool:
    actual_bool = _as_bool(actual)
    expected_bool = _as_bool(expected)
    if actual_bool is None or expected_bool is None:
        return False
    if operator == "==":
        return actual_bool == expected_bool
    if operator == "!=":
        return actual_bool != expected_bool
    return False


def _compare_list(actual: Any, operator: str, expected: Any) -> bool:
    actual_values = _as_list(actual)
    expected_values = _as_list(expected)

    if operator == "is empty":
        return len(actual_values) == 0
    if operator == "contains":
        return bool(expected_values) and expected_values[0] in actual_values
    if operator == "not contains":
        return not expected_values or expected_values[0] not in actual_values
    if operator == "contains any":
        return any(item in actual_values for item in expected_values)
    if operator == "contains all":
        return all(item in actual_values for item in expected_values)
    return False


def evaluate_rule(rule: AlertRule, data: dict[str, Any]) -> tuple[bool, Any]:
    actual = data.get(rule.field)

    if rule.field_type == "text":
        return _compare_text(actual, rule.operator, rule.value), actual
    if rule.field_type == "number":
        return _compare_number(actual, rule.operator, rule.value), actual
    if rule.field_type == "boolean":
        return _compare_boolean(actual, rule.operator, rule.value), actual
    if rule.field_type == "list":
        return _compare_list(actual, rule.operator, rule.value), actual
    return False, actual
