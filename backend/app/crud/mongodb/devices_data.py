from datetime import datetime, timedelta
from typing import Optional, Sequence, Dict, Any, List

from app.core.database import (
    devices_data_collection,
    devices_latest_collection,
    devices_rollup_min_collection,
    devices_rollup_hour_collection,
)

_FORMAT_BY_GRANULARITY = {
    "sec": "%Y-%m-%dT%H:%M:%S",
    "second": "%Y-%m-%dT%H:%M:%S",
    "minute": "%Y-%m-%dT%H:%M",
    "hour": "%Y-%m-%dT%H",
    "day": "%Y-%m-%d",
    "month": "%Y-%m",
    "year": "%Y",
}

_UNIT_BY_GRANULARITY = {
    "sec": "second",
    "second": "second",
    "minute": "minute",
    "hour": "hour",
    "day": "day",
    "week": "week",
    "month": "month",
    "year": "year",
}


def _timezone_from_offset(tz_offset_minutes: int) -> str:
    if tz_offset_minutes == 0:
        return "+00:00"
    sign = "-" if tz_offset_minutes > 0 else "+"
    total_minutes = abs(tz_offset_minutes)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{sign}{hours:02d}:{minutes:02d}"


def _has_index(collection, keys: list[tuple[str, int]], unique: bool | None = None) -> bool:
    for index in collection.list_indexes():
        key_items = list(index.get("key", {}).items())
        if key_items != keys:
            continue
        if unique is None:
            return True
        if bool(index.get("unique", False)) == unique:
            return True
    return False


def ensure_indexes() -> None:
    data_keys = [("device_id", 1), ("ts", 1)]
    if not _has_index(devices_data_collection, data_keys):
        devices_data_collection.create_index(data_keys)

    latest_keys = [("device_id", 1)]
    if not _has_index(devices_latest_collection, latest_keys, unique=True):
        devices_latest_collection.create_index(latest_keys, unique=True)

    if devices_rollup_min_collection is not None:
        if not _has_index(devices_rollup_min_collection, data_keys):
            devices_rollup_min_collection.create_index(data_keys)

    if devices_rollup_hour_collection is not None:
        if not _has_index(devices_rollup_hour_collection, data_keys):
            devices_rollup_hour_collection.create_index(data_keys)


def _build_group_id(granularity: str) -> dict:
    if granularity == "week":
        return {"isoWeekYear": {"$isoWeekYear": "$_ts"}, "isoWeek": {"$isoWeek": "$_ts"}}
    fmt = _FORMAT_BY_GRANULARITY.get(granularity)
    if not fmt:
        raise ValueError(f"Unsupported granularity: {granularity}")
    return {"bucket": {"$dateToString": {"format": fmt, "date": "$_ts"}}}


def _build_bucket_expression(granularity: str, timezone: str) -> dict:
    unit = _UNIT_BY_GRANULARITY.get(granularity)
    if not unit:
        raise ValueError(f"Unsupported granularity: {granularity}")
    expr = {
        "date": "$ts",
        "unit": unit,
        "timezone": timezone,
    }
    if unit == "week":
        expr["startOfWeek"] = "Mon"
    return {"$dateTrunc": expr}


def _build_bucket_id_expression(granularity: str, timezone: str) -> dict:
    fmt = _FORMAT_BY_GRANULARITY.get(granularity, "%Y-%m-%d")
    return {"$dateToString": {"format": fmt, "date": "$_bucket", "timezone": timezone}}


def _floor_to_hour(value: datetime) -> datetime:
    return value.replace(minute=0, second=0, microsecond=0)


def _floor_to_minute(value: datetime) -> datetime:
    return value.replace(second=0, microsecond=0)


def _shift_datetime(value: datetime, tz_offset_minutes: int) -> datetime:
    if not tz_offset_minutes:
        return value
    return value + timedelta(minutes=-tz_offset_minutes)


def _metric_for(field_metrics: Optional[Dict[str, str]], field: str, default: str) -> str:
    if not field_metrics:
        return default
    value = field_metrics.get(field)
    return value if isinstance(value, str) and value else default


def _truncate_two_decimals(value: Any) -> Any:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return value
    return int(value * 100) / 100


def _rollup_metric_value(
    source_data: Dict[str, Any],
    source_meta: Dict[str, Any],
    field: str,
    field_type: str,
    metric: str,
) -> Any:
    value_count = source_meta.get("value_count") or {}

    if field_type == "number":
        num_sum = source_meta.get("num_sum") or {}
        num_count = source_meta.get("num_count") or {}
        num_min = source_meta.get("num_min") or {}
        num_max = source_meta.get("num_max") or {}
        num_last = source_meta.get("num_last_value") or {}
        total = num_sum.get(field)
        count = num_count.get(field)
        if metric == "count":
            return count if isinstance(count, (int, float)) else value_count.get(field)
        if metric == "sum":
            return total
        if metric == "min":
            return num_min.get(field)
        if metric == "max":
            return num_max.get(field)
        if metric == "avg":
            if isinstance(total, (int, float)) and isinstance(count, (int, float)) and count > 0:
                return _truncate_two_decimals(total / count)
            return _truncate_two_decimals(source_data.get(field))
        return num_last.get(field, source_data.get(field))

    if field_type == "boolean":
        if metric == "count":
            true_counts = source_meta.get("boolean_true_count") or {}
            false_counts = source_meta.get("boolean_false_count") or {}
            state_counts = (source_meta.get("value_state_count") or {}).get(field) or {}
            return {
                "true": true_counts.get(field, state_counts.get("true", 0)),
                "false": false_counts.get(field, state_counts.get("false", 0)),
            }
        return (source_meta.get("last_value") or {}).get(field, source_data.get(field))

    if field_type == "text":
        if metric == "count":
            return (source_meta.get("value_state_count") or {}).get(field, {})
        return (source_meta.get("last_value") or {}).get(field, source_data.get(field))

    if field_type == "list":
        if metric == "count":
            return value_count.get(field)
        return (source_meta.get("list_last_value") or {}).get(field, source_data.get(field))

    if metric == "count":
        return value_count.get(field)
    return (source_meta.get("last_value") or {}).get(field, source_data.get(field))


def get_by_uid(
    uid: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    granularity: Optional[str] = None,
    limit: Optional[int] = None,
    fields: Optional[Sequence[str]] = None,
):
    """Fetch device data with optional time window and aggregation by granularity."""
    pipeline: list[dict] = [{"$match": {"device_id": uid}}]

    if start or end:
        # Apply time range filter.
        time_filter: dict = {}
        if start:
            time_filter["$gte"] = start
        if end:
            time_filter["$lte"] = end
        pipeline.append({"$match": {"ts": time_filter}})

    if granularity:
        pipeline.append(
            {
                "$addFields": {
                    "_ts": {
                        "$convert": {
                            "input": "$ts",
                            "to": "date",
                            "onError": None,
                            "onNull": None,
                        }
                    }
                }
            }
        )
        if start or end:
            pipeline.append({"$match": {"_ts": time_filter}})
        # Bucket by time and average numeric fields across each bucket.
        group_id = _build_group_id(granularity)
        pipeline.extend([
            {
                "$addFields": {
                    "data_kv": {"$objectToArray": {"$ifNull": ["$data", {}]}},
                }
            },
            {"$unwind": "$data_kv"},
            {
                "$addFields": {
                    "data_value": {
                        "$convert": {
                            "input": "$data_kv.v",
                            "to": "double",
                            "onError": None,
                            "onNull": None,
                        }
                    }
                }
            },
            {"$match": {"data_value": {"$ne": None}}},
            {
                "$group": {
                    "_id": {"bucket": group_id, "key": "$data_kv.k"},
                    "avg": {"$avg": "$data_value"},
                    "ts": {"$max": "$_ts"},
                    "device_id": {"$first": "$device_id"},
                }
            },
            {
                "$group": {
                    "_id": "$_id.bucket",
                    "data": {"$push": {"k": "$_id.key", "v": "$avg"}},
                    "ts": {"$max": "$ts"},
                    "device_id": {"$first": "$device_id"},
                }
            },
            {"$addFields": {"data": {"$arrayToObject": "$data"}}},
            {"$sort": {"ts": -1}},
        ])
    else:
        if fields:
            data_projection = {field: f"$data.{field}" for field in fields}
            pipeline.append(
                {
                    "$project": {
                        "device_id": 1,
                        "ts": 1,
                        "data": data_projection,
                    }
                }
            )
        # No aggregation: return raw docs newest-first.
        pipeline.append({"$sort": {"ts": -1}})

    if limit:
        # Limit final result size if requested.
        pipeline.append({"$limit": limit})

    # Drop internal _ts field from output if present.
    pipeline.append({"$project": {"_ts": 0}})

    cursor = devices_data_collection.aggregate(pipeline)
    return list(cursor)


def get_latest_by_uid(uid: str):
    return devices_latest_collection.find_one({"device_id": uid})


def get_aggregated_by_uid(
    uid: str,
    start: Optional[datetime],
    end: Optional[datetime],
    granularity: str,
    field_types: Dict[str, str],
    field_metrics: Optional[Dict[str, str]] = None,
    tz_offset_minutes: int = 0,
) -> List[Dict[str, Any]]:
    if not field_types:
        return []
    timezone = _timezone_from_offset(tz_offset_minutes)
    bucket_expr = _build_bucket_expression(granularity, timezone)
    bucket_id_expr = _build_bucket_id_expression(granularity, timezone)

    pipeline: list[dict] = [{"$match": {"device_id": uid}}]
    if start or end:
        time_filter: dict = {}
        if start:
            time_filter["$gte"] = start
        if end:
            time_filter["$lte"] = end
        pipeline.append({"$match": {"ts": time_filter}})

    pipeline.append({"$addFields": {"_bucket": bucket_expr}})
    pipeline.append({"$addFields": {"_bucket_id": bucket_id_expr}})

    # Project only the fields we care about to reduce payload and work.
    data_projection = {field: f"$data.{field}" for field in field_types.keys()}
    pipeline.append(
        {
            "$project": {
                "device_id": 1,
                "ts": 1,
                "_bucket": 1,
                "_bucket_id": 1,
                "data": data_projection,
            }
        }
    )

    numeric_fields = [field for field, ftype in field_types.items() if ftype == "number"]
    text_fields = [
        field
        for field, ftype in field_types.items()
        if ftype in {"text", "boolean"}
    ]
    text_count_fields = [
        field
        for field in text_fields
        if field_types.get(field) == "text" and _metric_for(field_metrics, field, "last_state") == "count"
    ]
    text_last_fields = [field for field in text_fields if field not in text_count_fields]
    list_fields = [field for field, ftype in field_types.items() if ftype == "list"]

    facets: Dict[str, list] = {}
    facet_keys: list[str] = []

    if numeric_fields:
        numeric_project: dict = {
            "_bucket": 1,
            "_bucket_id": 1,
            "device_id": 1,
        }
        for field in numeric_fields:
            numeric_project[field] = {
                "$convert": {
                    "input": f"$data.{field}",
                    "to": "double",
                    "onError": None,
                    "onNull": None,
                }
            }
        numeric_group: dict = {
            "_id": {"bucket": "$_bucket_id"},
            "device_id": {"$first": "$device_id"},
            "ts": {"$first": "$_bucket"},
        }
        for field in numeric_fields:
            numeric_group[f"{field}_sum"] = {"$sum": {"$ifNull": [f"${field}", 0]}}
            numeric_group[f"{field}_count"] = {
                "$sum": {"$cond": [{"$ne": [f"${field}", None]}, 1, 0]}
            }
            numeric_group[f"{field}_min"] = {"$min": f"${field}"}
            numeric_group[f"{field}_max"] = {"$max": f"${field}"}
            numeric_group[f"{field}_last"] = {
                "$max": {
                    "$cond": [
                        {"$ne": [f"${field}", None]},
                        {"ts": "$ts", "value": f"${field}"},
                        None,
                    ]
                }
            }
        numeric_data: Dict[str, Any] = {}
        for field in numeric_fields:
            metric = _metric_for(field_metrics, field, "last_value")
            if metric == "count":
                value_expr = f"${field}_count"
            elif metric == "sum":
                value_expr = f"${field}_sum"
            elif metric == "min":
                value_expr = f"${field}_min"
            elif metric == "max":
                value_expr = f"${field}_max"
            elif metric == "avg":
                value_expr = {
                    "$cond": [
                        {"$gt": [f"${field}_count", 0]},
                        {"$trunc": [{"$divide": [f"${field}_sum", f"${field}_count"]}, 2]},
                        "$$REMOVE",
                    ]
                }
            else:
                value_expr = f"${field}_last.value"
            numeric_data[field] = {
                "$cond": [
                    {"$gt": [f"${field}_count", 0]},
                    value_expr,
                    "$$REMOVE",
                ]
            }
        numeric_project_out = {
            "_id": 1,
            "device_id": 1,
            "ts": 1,
            "data": numeric_data,
        }
        facets["numeric"] = [
            {"$project": numeric_project},
            {"$group": numeric_group},
            {"$project": numeric_project_out},
        ]
        facet_keys.append("numeric")

    if text_last_fields:
        text_group: dict = {
            "_id": {"bucket": "$_bucket_id"},
            "device_id": {"$first": "$device_id"},
            "ts": {"$first": "$_bucket"},
        }
        for field in text_last_fields:
            text_group[f"{field}_count"] = {
                "$sum": {
                    "$cond": [
                        {"$ne": [{"$ifNull": [f"$data.{field}", None]}, None]},
                        1,
                        0,
                    ]
                }
            }
            text_group[f"{field}_true_count"] = {
                "$sum": {"$cond": [{"$eq": [f"$data.{field}", True]}, 1, 0]}
            }
            text_group[f"{field}_false_count"] = {
                "$sum": {"$cond": [{"$eq": [f"$data.{field}", False]}, 1, 0]}
            }
            text_group[field] = {
                "$max": {
                    "$cond": [
                        {
                            "$ne": [
                                {"$ifNull": [f"$data.{field}", None]},
                                None,
                            ]
                        },
                        {"ts": "$ts", "value": f"$data.{field}"},
                        None,
                    ]
                }
            }
        text_data: Dict[str, Any] = {}
        for field in text_last_fields:
            metric = _metric_for(
                field_metrics,
                field,
                "latest_value" if field_types.get(field) == "boolean" else "last_state",
            )
            if metric == "count" and field_types.get(field) == "boolean":
                value_expr = {
                    "true": f"${field}_true_count",
                    "false": f"${field}_false_count",
                }
            elif metric == "count":
                value_expr = f"${field}_count"
            else:
                value_expr = f"${field}.value"
            text_data[field] = {
                "$cond": [
                    {"$gt": [f"${field}_count", 0]},
                    value_expr,
                    "$$REMOVE",
                ]
            }
        text_project_out = {
            "_id": 1,
            "device_id": 1,
            "ts": 1,
            "data": text_data,
        }
        facets["text"] = [
            {"$group": text_group},
            {"$project": text_project_out},
        ]
        facet_keys.append("text")

    for idx, field in enumerate(text_count_fields):
        facet_name = f"text_count_{idx}"
        facets[facet_name] = [
            {
                "$project": {
                    "_bucket": 1,
                    "_bucket_id": 1,
                    "device_id": 1,
                    "value": f"$data.{field}",
                }
            },
            {"$match": {"value": {"$ne": None}}},
            {
                "$group": {
                    "_id": {
                        "bucket": "$_bucket_id",
                        "device_id": "$device_id",
                        "value": {"$toString": "$value"},
                    },
                    "ts": {"$first": "$_bucket"},
                    "device_id": {"$first": "$device_id"},
                    "count": {"$sum": 1},
                }
            },
            {
                "$group": {
                    "_id": {"bucket": "$_id.bucket"},
                    "device_id": {"$first": "$device_id"},
                    "ts": {"$first": "$ts"},
                    "counts": {"$push": {"k": "$_id.value", "v": "$count"}},
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "device_id": 1,
                    "ts": 1,
                    "data": {field: {"$arrayToObject": "$counts"}},
                }
            },
        ]
        facet_keys.append(facet_name)

    for idx, field in enumerate(list_fields):
        list_value = f"$data.{field}"
        facet_name = f"list_{idx}"
        metric = _metric_for(field_metrics, field, "latest_list")
        list_value_expr: Any = f"${field}_last.value"
        if metric == "count":
            list_value_expr = f"${field}_count"
        facets[facet_name] = [
            {
                "$project": {
                    "_bucket": 1,
                    "_bucket_id": 1,
                    "device_id": 1,
                    "ts": 1,
                    "value": list_value,
                }
            },
            {
                "$group": {
                    "_id": {"bucket": "$_bucket_id", "device_id": "$device_id"},
                    "ts": {"$first": "$_bucket"},
                    "device_id": {"$first": "$device_id"},
                    f"{field}_count": {
                        "$sum": {
                            "$cond": [
                                {"$ne": [{"$ifNull": ["$value", None]}, None]},
                                1,
                                0,
                            ]
                        }
                    },
                    f"{field}_last": {
                        "$max": {
                            "$cond": [
                                {"$ne": [{"$ifNull": ["$value", None]}, None]},
                                {"ts": "$ts", "value": "$value"},
                                None,
                            ]
                        }
                    },
                }
            },
            {
                "$project": {
                    "_id": {"bucket": "$_id.bucket"},
                    "device_id": 1,
                    "ts": 1,
                    "data": {
                        field: {
                            "$cond": [
                                {"$gt": [f"${field}_count", 0]},
                                list_value_expr,
                                "$$REMOVE",
                            ]
                        }
                    },
                }
            },
        ]
        facet_keys.append(facet_name)

    if not facet_keys:
        return []

    pipeline.append({"$facet": facets})
    pipeline.append(
        {
            "$project": {
                "all": {
                    "$concatArrays": [f"${key}" for key in facet_keys],
                }
            }
        }
    )
    pipeline.append({"$unwind": "$all"})
    pipeline.append({"$replaceRoot": {"newRoot": "$all"}})
    pipeline.append(
        {
            "$group": {
                "_id": "$_id",
                "device_id": {"$first": "$device_id"},
                "ts": {"$first": "$ts"},
                "data": {"$push": "$data"},
            }
        }
    )
    pipeline.append(
        {
            "$project": {
                "_id": 1,
                "device_id": 1,
                "ts": 1,
                "data": {
                    "$reduce": {
                        "input": "$data",
                        "initialValue": {},
                        "in": {
                            "$mergeObjects": [
                                "$$value",
                                {
                                    "$cond": [
                                        {"$eq": [{"$type": "$$this"}, "object"]},
                                        "$$this",
                                        {},
                                    ]
                                },
                            ]
                        },
                    }
                },
            }
        }
    )
    pipeline.append({"$sort": {"ts": -1}})

    return list(devices_data_collection.aggregate(pipeline))


def get_rollup_aggregated_by_uid(
    uid: str,
    start: Optional[datetime],
    end: Optional[datetime],
    granularity: str,
    field_types: Dict[str, str],
    field_metrics: Optional[Dict[str, str]] = None,
    tz_offset_minutes: int = 0,
) -> List[Dict[str, Any]]:
    if not field_types:
        return []

    query: Dict[str, Any] = {"device_id": uid}
    if start or end:
        time_filter: Dict[str, datetime] = {}
        if start:
            time_filter["$gte"] = _floor_to_hour(start)
        if end:
            time_filter["$lte"] = _floor_to_hour(end)
        query["ts"] = time_filter

    def bucket_for(ts: datetime) -> tuple[tuple[Any, ...], dict, datetime]:
        local_ts = _shift_datetime(ts, tz_offset_minutes)
        if granularity == "week":
            iso = local_ts.isocalendar()
            start_local = datetime.fromisocalendar(iso.year, iso.week, 1)
            return (
                ("week", iso.year, iso.week),
                {"isoWeekYear": iso.year, "isoWeek": iso.week},
                start_local.replace(tzinfo=ts.tzinfo),
            )
        fmt = _FORMAT_BY_GRANULARITY.get(granularity)
        if not fmt:
            raise ValueError(f"Unsupported granularity: {granularity}")
        if granularity == "day":
            bucket_ts = local_ts.replace(hour=0, minute=0, second=0, microsecond=0)
        elif granularity == "month":
            bucket_ts = datetime(local_ts.year, local_ts.month, 1, tzinfo=local_ts.tzinfo)
        elif granularity == "year":
            bucket_ts = datetime(local_ts.year, 1, 1, tzinfo=local_ts.tzinfo)
        else:
            bucket_ts = local_ts.replace(minute=0, second=0, microsecond=0)
        bucket_id = {"bucket": local_ts.strftime(fmt)}
        return ((granularity, bucket_id["bucket"]), bucket_id, bucket_ts)

    buckets: Dict[tuple[Any, ...], Dict[str, Any]] = {}
    cursor = devices_rollup_hour_collection.find(query, {"device_id": 1, "ts": 1, "data": 1, "meta": 1}).sort("ts", 1)
    for doc in cursor:
        ts = doc.get("ts")
        if not isinstance(ts, datetime):
            continue
        bucket_key, bucket_id, bucket_ts = bucket_for(ts)
        bucket = buckets.setdefault(
            bucket_key,
            {"_id": bucket_id, "device_id": doc.get("device_id"), "ts": bucket_ts, "fields": {}},
        )
        source_data = doc.get("data") or {}
        source_meta = doc.get("meta") or {}
        for field, field_type in field_types.items():
            value = _rollup_metric_value(source_data, source_meta, field, field_type, "latest_value" if field_type == "boolean" else "last_value")
            count = ((source_meta.get("num_count") or {}).get(field) if field_type == "number" else (source_meta.get("value_count") or {}).get(field))
            if value is None and count is None:
                continue
            stats = bucket["fields"].setdefault(
                field,
                {
                    "sum": 0.0,
                    "count": 0,
                    "min": None,
                    "max": None,
                    "last_ts": None,
                    "last": None,
                    "true": 0,
                    "false": 0,
                    "states": {},
                },
            )
            if field_type == "number":
                total = (source_meta.get("num_sum") or {}).get(field)
                numeric_count = (source_meta.get("num_count") or {}).get(field)
                if isinstance(total, (int, float)) and isinstance(numeric_count, (int, float)):
                    stats["sum"] += total
                    stats["count"] += numeric_count
                field_min = (source_meta.get("num_min") or {}).get(field)
                field_max = (source_meta.get("num_max") or {}).get(field)
                if isinstance(field_min, (int, float)):
                    stats["min"] = field_min if stats["min"] is None else min(stats["min"], field_min)
                if isinstance(field_max, (int, float)):
                    stats["max"] = field_max if stats["max"] is None else max(stats["max"], field_max)
                last_ts = (source_meta.get("num_last_ts") or {}).get(field) or ts
                last_value = (source_meta.get("num_last_value") or {}).get(field, source_data.get(field))
            else:
                field_count = (source_meta.get("value_count") or {}).get(field)
                if isinstance(field_count, (int, float)):
                    stats["count"] += field_count
                state_counts = (source_meta.get("value_state_count") or {}).get(field) or {}
                if isinstance(state_counts, dict):
                    for state, state_count in state_counts.items():
                        if isinstance(state_count, (int, float)):
                            state_key = str(state)
                            stats["states"][state_key] = stats["states"].get(state_key, 0) + state_count
                if field_type == "boolean":
                    stats["true"] += (source_meta.get("boolean_true_count") or {}).get(field, 0)
                    stats["false"] += (source_meta.get("boolean_false_count") or {}).get(field, 0)
                    if not stats["true"] and state_counts.get("true"):
                        stats["true"] += state_counts.get("true", 0)
                    if not stats["false"] and state_counts.get("false"):
                        stats["false"] += state_counts.get("false", 0)
                last_key = "list_last_ts" if field_type == "list" else "text_last_ts"
                last_value_key = "list_last_value" if field_type == "list" else "last_value"
                last_ts = (source_meta.get(last_key) or {}).get(field) or ts
                last_value = (source_meta.get(last_value_key) or {}).get(field, source_data.get(field))
            if last_value is not None and (not isinstance(stats["last_ts"], datetime) or last_ts >= stats["last_ts"]):
                stats["last_ts"] = last_ts
                stats["last"] = last_value

    results: List[Dict[str, Any]] = []
    for bucket in buckets.values():
        data: Dict[str, Any] = {}
        for field, field_type in field_types.items():
            stats = bucket["fields"].get(field)
            if not stats:
                continue
            metric = _metric_for(
                field_metrics,
                field,
                {"number": "last_value", "boolean": "latest_value", "list": "latest_list"}.get(field_type, "last_state"),
            )
            if metric == "count" and field_type == "boolean":
                value = {"true": stats["true"], "false": stats["false"]}
            elif metric == "count" and field_type == "text":
                value = stats["states"]
            elif metric == "count":
                value = stats["count"]
            elif field_type == "number" and metric == "sum":
                value = stats["sum"]
            elif field_type == "number" and metric == "min":
                value = stats["min"]
            elif field_type == "number" and metric == "max":
                value = stats["max"]
            elif field_type == "number" and metric == "avg":
                value = _truncate_two_decimals(stats["sum"] / stats["count"]) if stats["count"] else None
            else:
                value = stats["last"]
            if value is not None:
                data[field] = value
        if data:
            results.append(
                {
                    "_id": bucket["_id"],
                    "device_id": bucket["device_id"],
                    "ts": bucket["ts"],
                    "data": data,
                }
            )

    results.sort(key=lambda item: item.get("ts") or datetime.min, reverse=True)
    return results


def get_rollup_hour_by_uid(
    uid: str,
    start: Optional[datetime],
    end: Optional[datetime],
    field_types: Dict[str, str],
    field_metrics: Optional[Dict[str, str]] = None,
    tz_offset_minutes: int = 0,
) -> List[Dict[str, Any]]:
    if not field_types:
        return []

    query: Dict[str, Any] = {"device_id": uid}
    if start or end:
        time_filter: Dict[str, datetime] = {}
        if start:
            time_filter["$gte"] = _floor_to_hour(start)
        if end:
            time_filter["$lte"] = _floor_to_hour(end)
        query["ts"] = time_filter

    projection: Dict[str, Any] = {
        "device_id": 1,
        "ts": 1,
        "data": 1,
        "meta": 1,
    }

    results: List[Dict[str, Any]] = []
    cursor = devices_rollup_hour_collection.find(query, projection).sort("ts", -1)
    for doc in cursor:
        ts = doc.get("ts")
        if not isinstance(ts, datetime):
            continue

        source_data = doc.get("data") or {}
        source_meta = doc.get("meta") or {}

        data: Dict[str, Any] = {}
        for field, field_type in field_types.items():
            metric = _metric_for(
                field_metrics,
                field,
                {
                    "number": "last_value",
                    "boolean": "latest_value",
                    "list": "latest_list",
                }.get(field_type, "last_state"),
            )
            value = _rollup_metric_value(source_data, source_meta, field, field_type, metric)
            if value is None:
                continue
            data[field] = value

        if not data:
            continue

        bucket_ts = _shift_datetime(ts, tz_offset_minutes)
        results.append(
            {
                "_id": {"bucket": bucket_ts.strftime(_FORMAT_BY_GRANULARITY["hour"])},
                "device_id": doc.get("device_id"),
                "ts": ts,
                "data": data,
            }
        )

    return results


def get_rollup_min_by_uid(
    uid: str,
    start: Optional[datetime],
    end: Optional[datetime],
    field_types: Dict[str, str],
    field_metrics: Optional[Dict[str, str]] = None,
    tz_offset_minutes: int = 0,
) -> List[Dict[str, Any]]:
    if not field_types:
        return []

    query: Dict[str, Any] = {"device_id": uid}
    if start or end:
        time_filter: Dict[str, datetime] = {}
        if start:
            time_filter["$gte"] = _floor_to_minute(start)
        if end:
            time_filter["$lte"] = _floor_to_minute(end)
        query["ts"] = time_filter

    projection: Dict[str, Any] = {
        "device_id": 1,
        "ts": 1,
        "data": 1,
        "meta": 1,
    }

    results: List[Dict[str, Any]] = []
    cursor = devices_rollup_min_collection.find(query, projection).sort("ts", -1)
    for doc in cursor:
        ts = doc.get("ts")
        if not isinstance(ts, datetime):
            continue

        source_data = doc.get("data") or {}
        source_meta = doc.get("meta") or {}
        data: Dict[str, Any] = {}
        for field, field_type in field_types.items():
            metric = _metric_for(
                field_metrics,
                field,
                {
                    "number": "last_value",
                    "boolean": "latest_value",
                    "list": "latest_list",
                }.get(field_type, "last_state"),
            )
            value = _rollup_metric_value(source_data, source_meta, field, field_type, metric)
            if value is None:
                continue
            data[field] = value

        if not data:
            continue

        bucket_ts = _shift_datetime(ts, tz_offset_minutes)
        results.append(
            {
                "_id": {"bucket": bucket_ts.strftime(_FORMAT_BY_GRANULARITY["minute"])},
                "device_id": doc.get("device_id"),
                "ts": ts,
                "data": data,
            }
        )

    return results


def get_seed_values_before(
    uid: str,
    before: datetime,
    fields: Sequence[str],
    limit: int = 100000,
    source: str = "raw",
) -> Dict[str, Any]:
    if not before or not fields:
        return {}

    projection: Dict[str, Any] = {"_id": 0}
    for field in fields:
        projection[f"data.{field}"] = 1

    collection = devices_data_collection
    query_before = before
    if source == "minute":
        collection = devices_rollup_min_collection
        query_before = _floor_to_minute(before)
    elif source == "hour":
        collection = devices_rollup_hour_collection
        query_before = _floor_to_hour(before)

    seed: Dict[str, Any] = {}
    cursor = collection.find(
        {"device_id": uid, "ts": {"$lt": query_before}},
        projection=projection,
        sort=[("ts", -1)],
        limit=limit,
    )

    for doc in cursor:
        data = doc.get("data")
        if not isinstance(data, dict):
            continue
        for field in fields:
            if field in seed:
                continue
            value = data.get(field)
            if value is None:
                continue
            seed[field] = value
        if len(seed) == len(fields):
            break
    return seed


def get_rollup_min_ts(uid: str) -> Optional[datetime]:
    doc = devices_rollup_min_collection.find_one(
        {"device_id": uid},
        sort=[("ts", 1)],
        projection={"ts": 1},
    )
    if not doc:
        return None
    return doc.get("ts")


def get_rollup_hour_ts(uid: str) -> Optional[datetime]:
    doc = devices_rollup_hour_collection.find_one(
        {"device_id": uid},
        sort=[("ts", 1)],
        projection={"ts": 1},
    )
    if not doc:
        return None
    return doc.get("ts")
