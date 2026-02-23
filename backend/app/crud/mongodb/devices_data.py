from datetime import datetime
from typing import Optional

from app.core.database import devices_data_collection, devices_latest_collection

_FORMAT_BY_GRANULARITY = {
    "sec": "%Y-%m-%dT%H:%M:%S",
    "second": "%Y-%m-%dT%H:%M:%S",
    "minute": "%Y-%m-%dT%H:%M",
    "hour": "%Y-%m-%dT%H",
    "day": "%Y-%m-%d",
    "month": "%Y-%m",
    "year": "%Y",
}


def _build_group_id(granularity: str) -> dict:
    if granularity == "week":
        return {"isoWeekYear": {"$isoWeekYear": "$_ts"}, "isoWeek": {"$isoWeek": "$_ts"}}
    fmt = _FORMAT_BY_GRANULARITY.get(granularity)
    if not fmt:
        raise ValueError(f"Unsupported granularity: {granularity}")
    return {"bucket": {"$dateToString": {"format": fmt, "date": "$_ts"}}}


def get_by_uid(
    uid: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    granularity: Optional[str] = None,
    limit: Optional[int] = None,
):
    """Fetch device data with optional time window and aggregation by granularity."""
    pipeline: list[dict] = [
        # Filter by device id and normalize ts into a Date for downstream ops.
        {"$match": {"device_id": uid}},
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
        },
    ]

    if start or end:
        # Apply time range filter.
        time_filter: dict = {}
        if start:
            time_filter["$gte"] = start
        if end:
            time_filter["$lte"] = end
        pipeline.append({"$match": {"_ts": time_filter}})

    if granularity:
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
        # No aggregation: return raw docs newest-first.
        pipeline.append({"$sort": {"_ts": -1}})

    if limit:
        # Limit final result size if requested.
        pipeline.append({"$limit": limit})

    # Drop internal _ts field from output.
    pipeline.append({"$project": {"_ts": 0}})

    cursor = devices_data_collection.aggregate(pipeline)
    return list(cursor)


def get_latest_by_uid(uid: str):
    return devices_latest_collection.find_one({"device_id": uid})
