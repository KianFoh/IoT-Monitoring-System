from datetime import datetime
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


def normalize_field_type(value: Any) -> str:
    if not isinstance(value, str):
        return "text"
    normalized = value.strip().lower()
    if normalized in {"list", "array"}:
        return "list"
    if normalized in {"number", "numeric", "float", "int"}:
        return "number"
    if normalized in {"text", "string"}:
        return "text"
    return "text"


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
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


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


def _bucket_key_and_id(ts: datetime, granularity: str) -> Tuple[Tuple[Any, ...], dict]:
    if granularity == "week":
        iso = ts.isocalendar()
        return ("week", iso.year, iso.week), {"isoWeekYear": iso.year, "isoWeek": iso.week}
    fmt = _AGGREGATION_DATE_FORMATS.get(granularity)
    if not fmt:
        raise ValueError(f"Unsupported granularity: {granularity}")
    bucket_value = ts.strftime(fmt)
    return (granularity, bucket_value), {"bucket": bucket_value}


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
) -> List[dict]:
    buckets: Dict[Tuple[Any, ...], dict] = {}
    for doc in docs:
        ts = _coerce_datetime(doc.get("ts") or doc.get("_ts"))
        if not ts:
            continue
        bucket_key, bucket_id = _bucket_key_and_id(ts, granularity)
        bucket = buckets.get(bucket_key)
        if not bucket:
            bucket = {
                "_id": bucket_id,
                "device_id": doc.get("device_id"),
                "ts": ts,
                "_number": {},
                "_text": {},
                "_list": {},
            }
            buckets[bucket_key] = bucket
        else:
            if ts > bucket["ts"]:
                bucket["ts"] = ts
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

    results.sort(key=lambda item: item.get("ts") or datetime.min, reverse=True)
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
