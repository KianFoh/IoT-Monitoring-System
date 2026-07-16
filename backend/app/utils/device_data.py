from datetime import datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Optional, Tuple

_AGGREGATION_DATE_FORMATS = {
    "sec": "%Y-%m-%dT%H:%M:%S",
    "second": "%Y-%m-%dT%H:%M:%S",
    "minute": "%Y-%m-%dT%H:%M",
    "hour": "%Y-%m-%dT%H",
    "day": "%Y-%m-%d",
    "month": "%Y-%m",
    "year": "%Y",
}

_MIN_AWARE = datetime.min.replace(tzinfo=timezone.utc)


def normalize_field_type(value: Any) -> str:
    if not isinstance(value, str):
        return "text"
    normalized = value.strip().lower()
    if normalized in {"boolean", "bool"}:
        return "boolean"
    if normalized in {"list", "array"}:
        return "list"
    if normalized in {"number", "numeric", "float", "int"}:
        return "number"
    if normalized in {"text", "string"}:
        return "text"
    return "text"


def normalize_field_metric(field_type: str, value: Any) -> str:
    default_by_type = {
        "text": "last_state",
        "number": "last_value",
        "boolean": "latest_value",
        "list": "latest_list",
    }
    valid_by_type = {
        "text": {"last_state", "count"},
        "number": {"count", "sum", "min", "max", "last_value", "avg"},
        "boolean": {"latest_value", "count"},
        "list": {"latest_list", "count"},
    }
    normalized_type = normalize_field_type(field_type)
    default = default_by_type.get(normalized_type, "last_state")
    if not isinstance(value, str):
        return default
    normalized = value.strip().lower()
    if normalized_type == "boolean" and normalized == "true_false_counts":
        return "count"
    if normalized in valid_by_type.get(normalized_type, set()):
        return normalized
    return default


def extract_panel_fields_and_config(
    dashboard_config: Optional[dict],
) -> Tuple[List[str], Dict[str, dict]]:
    if not isinstance(dashboard_config, dict):
        return [], {}
    if "data_panel" in dashboard_config:
        panel = dashboard_config.get("data_panel") or {}
        fields = panel.get("fields") or []
        config = panel.get("config") or {}
    else:
        fields = dashboard_config.get("data_panel_fields") or []
        config = dashboard_config.get("data_panel_config") or {}
    fields = [
        field.strip()
        for field in fields
        if isinstance(field, str) and field.strip()
    ]
    if not isinstance(config, dict):
        config = {}
    return fields, config


def _coerce_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return _normalize_datetime(value)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return _normalize_datetime(parsed)
        except ValueError:
            return None
    return None


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _floor_datetime(value: datetime, granularity: str) -> datetime:
    tzinfo = value.tzinfo
    if granularity in {"sec", "second"}:
        return value.replace(microsecond=0)
    if granularity == "minute":
        return value.replace(second=0, microsecond=0)
    if granularity == "hour":
        return value.replace(minute=0, second=0, microsecond=0)
    if granularity == "day":
        return value.replace(hour=0, minute=0, second=0, microsecond=0)
    if granularity == "week":
        iso = value.isocalendar()
        week_start = datetime.fromisocalendar(iso.year, iso.week, 1)
        return week_start.replace(tzinfo=tzinfo)
    if granularity == "month":
        return datetime(value.year, value.month, 1, tzinfo=tzinfo)
    if granularity == "year":
        return datetime(value.year, 1, 1, tzinfo=tzinfo)
    return value.replace(microsecond=0)

def _shift_datetime(value: datetime, tz_offset_minutes: int) -> datetime:
    if not tz_offset_minutes:
        return value
    return value + timedelta(minutes=-tz_offset_minutes)


def _unshift_datetime(value: datetime, tz_offset_minutes: int) -> datetime:
    if not tz_offset_minutes:
        return value
    return value + timedelta(minutes=tz_offset_minutes)


def _floor_datetime_with_offset(
    value: datetime, granularity: str, tz_offset_minutes: int
) -> datetime:
    local_value = _shift_datetime(value, tz_offset_minutes)
    local_floor = _floor_datetime(local_value, granularity)
    return _unshift_datetime(local_floor, tz_offset_minutes)


def _advance_datetime(value: datetime, granularity: str) -> datetime:
    if granularity in {"sec", "second"}:
        return value + timedelta(seconds=1)
    if granularity == "minute":
        return value + timedelta(minutes=1)
    if granularity == "hour":
        return value + timedelta(hours=1)
    if granularity == "day":
        return value + timedelta(days=1)
    if granularity == "week":
        return value + timedelta(weeks=1)
    if granularity == "month":
        year = value.year + (value.month // 12)
        month = 1 if value.month == 12 else value.month + 1
        return datetime(year, month, 1, tzinfo=value.tzinfo)
    if granularity == "year":
        return datetime(value.year + 1, 1, 1, tzinfo=value.tzinfo)
    return value + timedelta(seconds=1)

def _advance_datetime_with_offset(
    value: datetime, granularity: str, tz_offset_minutes: int
) -> datetime:
    local_value = _shift_datetime(value, tz_offset_minutes)
    local_next = _advance_datetime(local_value, granularity)
    return _unshift_datetime(local_next, tz_offset_minutes)


def _align_range_start(value: datetime, granularity: str, tz_offset_minutes: int) -> datetime:
    return _floor_datetime_with_offset(value, granularity, tz_offset_minutes)


def _coerce_number(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        return num if math.isfinite(num) else None
    if isinstance(value, str):
        try:
            num = float(value)
            return num if math.isfinite(num) else None
        except ValueError:
            return None
    return None


def _bucket_key_and_id(
    ts: datetime, granularity: str, tz_offset_minutes: int
) -> Tuple[Tuple[Any, ...], dict]:
    local_ts = _shift_datetime(ts, tz_offset_minutes)
    if granularity == "week":
        iso = local_ts.isocalendar()
        return ("week", iso.year, iso.week), {"isoWeekYear": iso.year, "isoWeek": iso.week}
    fmt = _AGGREGATION_DATE_FORMATS.get(granularity)
    if not fmt:
        raise ValueError(f"Unsupported granularity: {granularity}")
    bucket_value = local_ts.strftime(fmt)
    return (granularity, bucket_value), {"bucket": bucket_value}


def _bucket_start(ts: datetime, granularity: str, tz_offset_minutes: int) -> datetime:
    return _floor_datetime_with_offset(ts, granularity, tz_offset_minutes)


def _update_list_counts(counts: Dict[str, float], value: Any) -> None:
    if value is None:
        return
    if isinstance(value, dict):
        for key, entry in value.items():
            count_key = str(key)
            inc = 1
            if not isinstance(entry, bool) and isinstance(entry, (int, float)):
                inc = float(entry)
            counts[count_key] = counts.get(count_key, 0) + inc
        return
    if isinstance(value, (list, tuple, set)):
        for item in value:
            count_key = str(item)
            counts[count_key] = counts.get(count_key, 0) + 1
        return
    count_key = str(value)
    counts[count_key] = counts.get(count_key, 0) + 1


def aggregate_device_data(
    docs: List[dict],
    field_types: Dict[str, str],
    granularity: str,
    tz_offset_minutes: int = 0,
) -> List[dict]:
    buckets: Dict[Tuple[Any, ...], dict] = {}
    for doc in docs:
        ts = _coerce_datetime(doc.get("ts") or doc.get("_ts"))
        if not ts:
            continue
        bucket_key, bucket_id = _bucket_key_and_id(ts, granularity, tz_offset_minutes)
        bucket = buckets.get(bucket_key)
        if not bucket:
            bucket = {
                "_id": bucket_id,
                "device_id": doc.get("device_id"),
                "ts": _bucket_start(ts, granularity, tz_offset_minutes),
                "_number": {},
                "_text": {},
                "_list": {},
            }
            buckets[bucket_key] = bucket
        else:
            if not bucket.get("device_id"):
                bucket["device_id"] = doc.get("device_id")

        data = doc.get("data") or {}
        if not isinstance(data, dict):
            continue
        for key, value in data.items():
            field_type = field_types.get(key)
            if not field_type:
                continue
            if field_type == "number":
                numeric_value = _coerce_number(value)
                if numeric_value is None:
                    continue
                aggregate = bucket["_number"].setdefault(key, {"sum": 0.0, "count": 0})
                aggregate["sum"] += numeric_value
                aggregate["count"] += 1
            elif field_type == "list":
                counts = bucket["_list"].setdefault(key, {})
                _update_list_counts(counts, value)
            else:
                if value is None:
                    continue
                current = bucket["_text"].get(key)
                if not current or ts >= current["ts"]:
                    bucket["_text"][key] = {"ts": ts, "value": value}

    results: List[dict] = []
    for bucket in buckets.values():
        data: Dict[str, Any] = {}
        for key, agg in bucket["_number"].items():
            if agg["count"]:
                data[key] = agg["sum"] / agg["count"]
        for key, entry in bucket["_text"].items():
            if entry["ts"] is not None:
                data[key] = entry["value"]
        for key, counts in bucket["_list"].items():
            if counts:
                data[key] = counts
        if not data:
            continue
        results.append(
            {
                "_id": bucket["_id"],
                "device_id": bucket.get("device_id"),
                "ts": bucket["ts"],
                "data": data,
            }
        )

    results.sort(
        key=lambda item: _coerce_datetime(item.get("ts") or item.get("_ts")) or _MIN_AWARE,
        reverse=True,
    )
    return results


def filter_raw_data(docs: List[dict], field_set: set[str]) -> List[dict]:
    filtered: List[dict] = []
    for doc in docs:
        data = doc.get("data")
        if not isinstance(data, dict):
            continue
        filtered_data = {key: data[key] for key in field_set if key in data}
        if not filtered_data:
            continue
        next_doc = dict(doc)
        next_doc["data"] = filtered_data
        filtered.append(next_doc)
    return filtered


def build_seed_values(
    docs: List[dict],
    field_types: Dict[str, str],
) -> Dict[str, Any]:
    if not docs:
        return {}
    fill_fields = [
        field
        for field, field_type in field_types.items()
        if field_type in {"text", "boolean"}
    ]
    if not fill_fields:
        return {}
    seed: Dict[str, Any] = {}
    for doc in docs:
        data = doc.get("data")
        if not isinstance(data, dict):
            continue
        for field in fill_fields:
            if field in seed:
                continue
            if field not in data:
                continue
            value = data.get(field)
            if value is None:
                continue
            seed[field] = value
        if len(seed) == len(fill_fields):
            break
    return seed


def fill_missing_state(
    docs: List[dict],
    field_types: Dict[str, str],
    seed_values: Optional[Dict[str, Any]] = None,
) -> List[dict]:
    if not docs:
        return docs
    fill_fields = [
        field
        for field, field_type in field_types.items()
        if field_type in {"text", "boolean"}
    ]
    if not fill_fields:
        return docs
    ordered = sorted(
        docs,
        key=lambda item: _coerce_datetime(item.get("ts") or item.get("_ts")) or _MIN_AWARE,
    )
    last_values: Dict[str, Any] = dict(seed_values or {})
    for doc in ordered:
        data = doc.get("data")
        if not isinstance(data, dict):
            continue
        for field in fill_fields:
            if field in data:
                value = data.get(field)
                if value is None:
                    if field in last_values:
                        data[field] = last_values[field]
                else:
                    last_values[field] = value
                continue
            if field in last_values:
                data[field] = last_values[field]
        doc["data"] = data
    ordered.sort(
        key=lambda item: _coerce_datetime(item.get("ts") or item.get("_ts")) or _MIN_AWARE,
        reverse=True,
    )
    return ordered


def densify_device_data(
    docs: List[dict],
    field_types: Dict[str, str],
    granularity: str,
    start: datetime,
    end: datetime,
    device_id: Optional[str] = None,
    seed_values: Optional[Dict[str, Any]] = None,
    tz_offset_minutes: int = 0,
) -> List[dict]:
    if start is None or end is None:
        return fill_missing_state(docs, field_types, seed_values)
    start = _normalize_datetime(start)
    end = _normalize_datetime(end)
    fill_fields = [
        field
        for field, field_type in field_types.items()
        if field_type in {"text", "boolean"}
    ]
    if not fill_fields:
        return docs

    existing: Dict[Tuple[Any, ...], dict] = {}
    for doc in docs:
        ts = _coerce_datetime(doc.get("ts") or doc.get("_ts"))
        if not ts:
            continue
        bucket_key, _ = _bucket_key_and_id(ts, granularity, tz_offset_minutes)
        existing[bucket_key] = doc

    cursor = _align_range_start(start, granularity, tz_offset_minutes)
    end_cursor = _floor_datetime_with_offset(end, granularity, tz_offset_minutes)
    now_cutoff = _floor_datetime_with_offset(datetime.now(timezone.utc), granularity, tz_offset_minutes)
    fill_cutoff = end_cursor if end_cursor <= now_cutoff else now_cutoff
    last_values: Dict[str, Any] = dict(seed_values or {})
    dense: List[dict] = []

    while cursor <= end_cursor:
        bucket_key, bucket_id = _bucket_key_and_id(cursor, granularity, tz_offset_minutes)
        current = existing.get(bucket_key)
        if current:
            data = current.get("data")
            if not isinstance(data, dict):
                data = {}
            else:
                data = dict(data)
            entry = dict(current)
        else:
            data = {}
            entry = {
                "_id": bucket_id,
                "device_id": device_id,
                "ts": cursor,
                "data": data,
            }

        for field in fill_fields:
            if field in data:
                value = data.get(field)
                if value is None:
                    if field in last_values and cursor <= fill_cutoff:
                        data[field] = last_values[field]
                else:
                    last_values[field] = value
                continue
            if field in last_values and cursor <= fill_cutoff:
                data[field] = last_values[field]

        entry["data"] = data
        dense.append(entry)
        cursor = _advance_datetime_with_offset(cursor, granularity, tz_offset_minutes)

    dense.sort(
        key=lambda item: _coerce_datetime(item.get("ts") or item.get("_ts")) or _MIN_AWARE,
        reverse=True,
    )
    return dense
