import argparse
import math
from datetime import datetime
from typing import Any, Dict, Iterable, Optional

from pymongo import MongoClient

from app.core.config import get_settings

settings = get_settings()
mongo_client = MongoClient(settings.mongo_uri_computed)
mongo_db = mongo_client[settings.MONGO_DB_NAME]
devices_data_collection = mongo_db[settings.DEVICES_DATA_COLLECTION_NAME]
devices_rollup_min_collection = mongo_db[settings.MONGO_ROLLUP_MIN_COLLECTION]
devices_rollup_hour_collection = mongo_db[settings.MONGO_ROLLUP_HOUR_COLLECTION]


def _floor_minute(value: datetime) -> datetime:
    return value.replace(second=0, microsecond=0)


def _floor_hour(value: datetime) -> datetime:
    return value.replace(minute=0, second=0, microsecond=0)


def _coerce_number(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        return num if math.isfinite(num) else None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            num = float(stripped)
        except ValueError:
            return None
        return num if math.isfinite(num) else None
    return None


def _iter_list_counts(value: Any) -> Iterable[tuple[str, int | float]]:
    if isinstance(value, dict):
        for key, entry in value.items():
            count: int | float = 1
            if not isinstance(entry, bool) and isinstance(entry, int):
                count = entry
            elif isinstance(entry, float):
                count = int(entry) if entry.is_integer() else float(entry)
            yield str(key), count
        return
    if isinstance(value, (list, tuple, set)):
        for item in value:
            yield str(item), 1
        return
    yield str(value), 1


def _state_key(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _empty_bucket(device_id: str, ts: datetime) -> Dict[str, Any]:
    return {
        "device_id": device_id,
        "ts": ts,
        "data": {},
        "meta": {
            "text_last_ts": {},
            "value_count": {},
            "value_state_count": {},
            "element_frequency": {},
            "num_sum": {},
            "num_count": {},
            "num_min": {},
            "num_max": {},
            "num_avg": {},
            "num_last_ts": {},
            "num_last_value": {},
        },
    }


def _infer_field_type(value: Any) -> str:
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (dict, list, tuple, set)):
        return "list"
    if _coerce_number(value) is not None:
        return "number"
    return "text"


def _merge_field_type(current: Optional[str], observed: str) -> str:
    if current == "list" or observed == "list":
        return "list"
    if current == "text" or observed == "text":
        return "text"
    if current in {"boolean", "bool"} and observed == "number":
        return "text"
    if current == "number" and observed in {"boolean", "bool"}:
        return "text"
    return observed if current is None else current


def _apply_value(bucket: Dict[str, Any], key: str, value: Any, field_type: str, source_ts: datetime) -> None:
    data = bucket["data"]
    meta = bucket["meta"]

    if field_type == "list":
        counts = data.setdefault(key, {})
        if not isinstance(counts, dict):
            counts = {}
            data[key] = counts
        element_frequency = meta["element_frequency"].setdefault(key, {})
        for item_key, inc in _iter_list_counts(value):
            counts[item_key] = counts.get(item_key, 0) + inc
            element_frequency[item_key] = element_frequency.get(item_key, 0) + inc
        meta["value_count"][key] = meta["value_count"].get(key, 0) + 1
        return

    if field_type in {"boolean", "bool", "text"}:
        meta["value_count"][key] = meta["value_count"].get(key, 0) + 1
        state_counts = meta["value_state_count"].setdefault(key, {})
        state = _state_key(value)
        state_counts[state] = state_counts.get(state, 0) + 1
        last_ts = meta["text_last_ts"].get(key)
        if not isinstance(last_ts, datetime) or source_ts >= last_ts:
            meta["text_last_ts"][key] = source_ts
            data[key] = value
        return

    if field_type in {"number", "numeric", "float", "int"}:
        meta["value_count"][key] = meta["value_count"].get(key, 0) + 1
        numeric_value = _coerce_number(value)
        if numeric_value is None:
            return
        meta["num_sum"][key] = meta["num_sum"].get(key, 0.0) + numeric_value
        meta["num_count"][key] = meta["num_count"].get(key, 0) + 1
        meta["num_min"][key] = min(meta["num_min"].get(key, numeric_value), numeric_value)
        meta["num_max"][key] = max(meta["num_max"].get(key, numeric_value), numeric_value)
        avg = meta["num_sum"][key] / meta["num_count"][key]
        meta["num_avg"][key] = avg
        last_ts = meta["num_last_ts"].get(key)
        if not isinstance(last_ts, datetime) or source_ts >= last_ts:
            meta["num_last_ts"][key] = source_ts
            meta["num_last_value"][key] = numeric_value
        data[key] = avg
        return

    meta["value_count"][key] = meta["value_count"].get(key, 0) + 1
    last_ts = meta["text_last_ts"].get(key)
    if not isinstance(last_ts, datetime) or source_ts >= last_ts:
        meta["text_last_ts"][key] = source_ts
        data[key] = value


def _compact_bucket(bucket: Dict[str, Any]) -> Dict[str, Any]:
    meta = bucket["meta"]
    compact_meta = {name: value for name, value in meta.items() if value}
    return {
        "_id": {"device_id": bucket["device_id"], "ts": bucket["ts"]},
        "device_id": bucket["device_id"],
        "ts": bucket["ts"],
        "data": bucket["data"],
        "meta": compact_meta,
    }


def _rebuild_for_device(device_uid: str, field_types: Dict[str, str]) -> tuple[int, int]:
    minute_buckets: Dict[datetime, Dict[str, Any]] = {}
    hour_buckets: Dict[datetime, Dict[str, Any]] = {}

    cursor = devices_data_collection.find(
        {"device_id": device_uid},
        projection={"device_id": 1, "ts": 1, "data": 1},
        sort=[("ts", 1)],
    )
    raw_count = 0
    for doc in cursor:
        ts = doc.get("ts")
        data = doc.get("data")
        device_id = doc.get("device_id")
        if not isinstance(ts, datetime) or not isinstance(data, dict) or not device_id:
            continue
        raw_count += 1

        minute_bucket = minute_buckets.setdefault(_floor_minute(ts), _empty_bucket(device_id, _floor_minute(ts)))
        hour_bucket = hour_buckets.setdefault(_floor_hour(ts), _empty_bucket(device_id, _floor_hour(ts)))

        for key, field_type in field_types.items():
            if key not in data:
                continue
            value = data.get(key)
            if value is None:
                continue
            _apply_value(minute_bucket, key, value, field_type, ts)
            _apply_value(hour_bucket, key, value, field_type, ts)

    devices_rollup_min_collection.delete_many({"device_id": device_uid})
    devices_rollup_hour_collection.delete_many({"device_id": device_uid})

    minute_docs = [_compact_bucket(bucket) for _, bucket in sorted(minute_buckets.items()) if bucket["data"]]
    hour_docs = [_compact_bucket(bucket) for _, bucket in sorted(hour_buckets.items()) if bucket["data"]]

    if minute_docs:
        devices_rollup_min_collection.insert_many(minute_docs)
    if hour_docs:
        devices_rollup_hour_collection.insert_many(hour_docs)

    return raw_count, len(minute_docs) + len(hour_docs)


def _load_device_field_types(device_uid: str, sample_limit: int = 5000) -> Dict[str, str]:
    inferred: Dict[str, str] = {}
    cursor = devices_data_collection.find(
        {"device_id": device_uid},
        projection={"data": 1},
        sort=[("ts", -1)],
        limit=sample_limit,
    )
    for doc in cursor:
        data = doc.get("data")
        if not isinstance(data, dict):
            continue
        for key, value in data.items():
            if value is None:
                continue
            inferred[key] = _merge_field_type(inferred.get(key), _infer_field_type(value))
    return inferred


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild minute and hourly Mongo rollups from raw device data.")
    parser.add_argument("--device", dest="device_uid", help="Specific device UID to rebuild")
    args = parser.parse_args()

    if args.device_uid:
        device_uids = [args.device_uid]
    else:
        device_uids = sorted(devices_data_collection.distinct("device_id"))

    total_raw = 0
    total_rollups = 0
    for device_uid in device_uids:
        field_types = _load_device_field_types(device_uid)
        if not field_types:
            print(f"skip {device_uid}: no dashboard field config")
            continue
        raw_count, rollup_count = _rebuild_for_device(device_uid, field_types)
        total_raw += raw_count
        total_rollups += rollup_count
        print(f"rebuilt {device_uid}: {raw_count} raw docs -> {rollup_count} rollup docs")

    print(f"done: {len(device_uids)} devices, {total_raw} raw docs, {total_rollups} rollup docs")


if __name__ == "__main__":
    main()
