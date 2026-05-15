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
            numeric_group[field] = {"$avg": f"${field}"}
        numeric_project_out = {
            "_id": 1,
            "device_id": 1,
            "ts": 1,
            "data": {
                field: {
                    "$cond": [
                        {"$ne": [f"${field}", None]},
                        f"${field}",
                        "$$REMOVE",
                    ]
                }
                for field in numeric_fields
            },
        }
        facets["numeric"] = [
            {"$project": numeric_project},
            {"$group": numeric_group},
            {"$project": numeric_project_out},
        ]
        facet_keys.append("numeric")

    if text_fields:
        text_group: dict = {
            "_id": {"bucket": "$_bucket_id"},
            "device_id": {"$first": "$device_id"},
            "ts": {"$first": "$_bucket"},
        }
        for field in text_fields:
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
        text_project_out = {
            "_id": 1,
            "device_id": 1,
            "ts": 1,
            "data": {
                field: {
                    "$cond": [
                        {"$ne": [f"${field}.value", None]},
                        f"${field}.value",
                        "$$REMOVE",
                    ]
                }
                for field in text_fields
            },
        }
        facets["text"] = [
            {"$group": text_group},
            {"$project": text_project_out},
        ]
        facet_keys.append("text")

    for idx, field in enumerate(list_fields):
        list_value = f"$data.{field}"
        list_items = {
            "$cond": [
                {"$isArray": list_value},
                {
                    "$map": {
                        "input": list_value,
                        "as": "item",
                        "in": {"k": "$$item", "v": 1},
                    }
                },
                {
                    "$cond": [
                        {"$eq": [{"$type": list_value}, "object"]},
                        {
                            "$map": {
                                "input": {"$objectToArray": list_value},
                                "as": "kv",
                                "in": {
                                    "k": "$$kv.k",
                                    "v": {
                                        "$cond": [
                                            {"$isNumber": "$$kv.v"},
                                            "$$kv.v",
                                            1,
                                        ]
                                    },
                                },
                            }
                        },
                        [],
                    ]
                },
            ]
        }
        facet_name = f"list_{idx}"
        facets[facet_name] = [
            {
                "$project": {
                    "_bucket": 1,
                    "_bucket_id": 1,
                    "device_id": 1,
                    "items": list_items,
                }
            },
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": {
                        "bucket": "$_bucket_id",
                        "device_id": "$device_id",
                        "key": "$items.k",
                    },
                    "ts": {"$first": "$_bucket"},
                    "total": {"$sum": "$items.v"},
                }
            },
            {
                "$group": {
                    "_id": {
                        "bucket": "$_id.bucket",
                        "device_id": "$_id.device_id",
                    },
                    "ts": {"$first": "$ts"},
                    "device_id": {"$first": "$_id.device_id"},
                    "items": {"$push": {"k": "$_id.key", "v": "$total"}},
                }
            },
            {
                "$project": {
                    "_id": {"bucket": "$_id.bucket"},
                    "device_id": 1,
                    "ts": 1,
                    "data": {field: {"$arrayToObject": "$items"}},
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
            time_filter["$gte"] = _floor_to_hour(start)
        if end:
            time_filter["$lte"] = _floor_to_hour(end)
        pipeline.append({"$match": {"ts": time_filter}})

    pipeline.append({"$addFields": {"_bucket": bucket_expr}})
    pipeline.append({"$addFields": {"_bucket_id": bucket_id_expr}})

    numeric_fields = [field for field, ftype in field_types.items() if ftype == "number"]
    text_fields = [
        field
        for field, ftype in field_types.items()
        if ftype in {"text", "boolean"}
    ]
    list_fields = [field for field, ftype in field_types.items() if ftype == "list"]

    meta_num_sum = {field: f"$meta.num_sum.{field}" for field in numeric_fields}
    meta_num_count = {field: f"$meta.num_count.{field}" for field in numeric_fields}
    meta_text_last = {field: f"$meta.text_last_ts.{field}" for field in text_fields}
    data_projection = {field: f"$data.{field}" for field in field_types.keys()}

    pipeline.append(
        {
            "$project": {
                "device_id": 1,
                "ts": 1,
                "_bucket": 1,
                "_bucket_id": 1,
                "data": data_projection,
                "meta": {
                    "num_sum": meta_num_sum,
                    "num_count": meta_num_count,
                    "text_last_ts": meta_text_last,
                },
            }
        }
    )

    facets: Dict[str, list] = {}
    facet_keys: list[str] = []

    if numeric_fields:
        numeric_project: dict = {
            "_bucket": 1,
            "_bucket_id": 1,
            "device_id": 1,
        }
        for field in numeric_fields:
            numeric_project[f"{field}_sum"] = {
                "$ifNull": [f"$meta.num_sum.{field}", 0]
            }
            numeric_project[f"{field}_count"] = {
                "$ifNull": [f"$meta.num_count.{field}", 0]
            }
        numeric_group: dict = {
            "_id": {"bucket": "$_bucket_id"},
            "device_id": {"$first": "$device_id"},
            "ts": {"$first": "$_bucket"},
        }
        for field in numeric_fields:
            numeric_group[f"{field}_sum"] = {"$sum": f"${field}_sum"}
            numeric_group[f"{field}_count"] = {"$sum": f"${field}_count"}
        numeric_project_out = {
            "_id": 1,
            "device_id": 1,
            "ts": 1,
            "data": {
                field: {
                    "$cond": [
                        {"$gt": [f"${field}_count", 0]},
                        {"$divide": [f"${field}_sum", f"${field}_count"]},
                        "$$REMOVE",
                    ]
                }
                for field in numeric_fields
            },
        }
        facets["numeric"] = [
            {"$project": numeric_project},
            {"$group": numeric_group},
            {"$project": numeric_project_out},
        ]
        facet_keys.append("numeric")

    if text_fields:
        text_group: dict = {
            "_id": {"bucket": "$_bucket_id"},
            "device_id": {"$first": "$device_id"},
            "ts": {"$first": "$_bucket"},
        }
        for field in text_fields:
            text_group[field] = {
                "$max": {
                    "$cond": [
                        {
                            "$ne": [
                                {"$ifNull": [f"$meta.text_last_ts.{field}", None]},
                                None,
                            ]
                        },
                        {
                            "ts": f"$meta.text_last_ts.{field}",
                            "value": f"$data.{field}",
                        },
                        None,
                    ]
                }
            }
        text_project_out = {
            "_id": 1,
            "device_id": 1,
            "ts": 1,
            "data": {
                field: {
                    "$cond": [
                        {"$ne": [f"${field}.value", None]},
                        f"${field}.value",
                        "$$REMOVE",
                    ]
                }
                for field in text_fields
            },
        }
        facets["text"] = [
            {"$group": text_group},
            {"$project": text_project_out},
        ]
        facet_keys.append("text")

    for idx, field in enumerate(list_fields):
        list_value = f"$data.{field}"
        list_items = {
            "$cond": [
                {"$isArray": list_value},
                {
                    "$map": {
                        "input": list_value,
                        "as": "item",
                        "in": {"k": "$$item", "v": 1},
                    }
                },
                {
                    "$cond": [
                        {"$eq": [{"$type": list_value}, "object"]},
                        {
                            "$map": {
                                "input": {"$objectToArray": list_value},
                                "as": "kv",
                                "in": {
                                    "k": "$$kv.k",
                                    "v": {
                                        "$cond": [
                                            {"$isNumber": "$$kv.v"},
                                            "$$kv.v",
                                            1,
                                        ]
                                    },
                                },
                            }
                        },
                        [],
                    ]
                },
            ]
        }
        facet_name = f"list_{idx}"
        facets[facet_name] = [
            {
                "$project": {
                    "_bucket": 1,
                    "_bucket_id": 1,
                    "device_id": 1,
                    "items": list_items,
                }
            },
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": {
                        "bucket": "$_bucket_id",
                        "device_id": "$device_id",
                        "key": "$items.k",
                    },
                    "ts": {"$first": "$_bucket"},
                    "total": {"$sum": "$items.v"},
                }
            },
            {
                "$group": {
                    "_id": {
                        "bucket": "$_id.bucket",
                        "device_id": "$_id.device_id",
                    },
                    "ts": {"$first": "$ts"},
                    "device_id": {"$first": "$_id.device_id"},
                    "items": {"$push": {"k": "$_id.key", "v": "$total"}},
                }
            },
            {
                "$project": {
                    "_id": {"bucket": "$_id.bucket"},
                    "device_id": 1,
                    "ts": 1,
                    "data": {field: {"$arrayToObject": "$items"}},
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

    return list(devices_rollup_hour_collection.aggregate(pipeline))


def get_rollup_hour_by_uid(
    uid: str,
    start: Optional[datetime],
    end: Optional[datetime],
    field_types: Dict[str, str],
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

    numeric_fields = [field for field, ftype in field_types.items() if ftype == "number"]
    passthrough_fields = [
        field for field, ftype in field_types.items() if ftype in {"text", "boolean", "list"}
    ]

    projection: Dict[str, Any] = {
        "device_id": 1,
        "ts": 1,
    }
    for field in passthrough_fields:
        projection[f"data.{field}"] = 1
    for field in numeric_fields:
        projection[f"meta.num_sum.{field}"] = 1
        projection[f"meta.num_count.{field}"] = 1

    results: List[Dict[str, Any]] = []
    cursor = devices_rollup_hour_collection.find(query, projection).sort("ts", -1)
    for doc in cursor:
        ts = doc.get("ts")
        if not isinstance(ts, datetime):
            continue

        source_data = doc.get("data") or {}
        source_meta = doc.get("meta") or {}
        num_sum = source_meta.get("num_sum") or {}
        num_count = source_meta.get("num_count") or {}

        data: Dict[str, Any] = {}
        for field in passthrough_fields:
            if field not in source_data:
                continue
            value = source_data.get(field)
            if value is None:
                continue
            data[field] = value

        for field in numeric_fields:
            total = num_sum.get(field)
            count = num_count.get(field)
            if not isinstance(total, (int, float)) or not isinstance(count, (int, float)):
                continue
            if count <= 0:
                continue
            data[field] = total / count

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

    requested_fields = list(field_types.keys())
    projection: Dict[str, Any] = {
        "device_id": 1,
        "ts": 1,
    }
    for field in requested_fields:
        projection[f"data.{field}"] = 1

    results: List[Dict[str, Any]] = []
    cursor = devices_rollup_min_collection.find(query, projection).sort("ts", -1)
    for doc in cursor:
        ts = doc.get("ts")
        if not isinstance(ts, datetime):
            continue

        source_data = doc.get("data") or {}
        data: Dict[str, Any] = {}
        for field in requested_fields:
            if field not in source_data:
                continue
            value = source_data.get(field)
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
