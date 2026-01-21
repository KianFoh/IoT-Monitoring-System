from datetime import datetime
from typing import Optional

from app.core.database import devices_data_collection

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
    pipeline: list[dict] = [
        {"$match": {"device_id": uid}},
        {
            "$addFields": {
                "_ts": {
                    "$convert": {
                        "input": "$timestamp",
                        "to": "date",
                        "onError": None,
                        "onNull": None,
                    }
                }
            }
        },
    ]

    if start or end:
        time_filter: dict = {}
        if start:
            time_filter["$gte"] = start
        if end:
            time_filter["$lte"] = end
        pipeline.append({"$match": {"_ts": time_filter}})

    pipeline.append({"$sort": {"_ts": -1}})

    if granularity:
        group_id = _build_group_id(granularity)
        pipeline.extend(
            [
                {"$group": {"_id": group_id, "doc": {"$first": "$$ROOT"}}},
                {"$replaceRoot": {"newRoot": "$doc"}},
                {"$sort": {"_ts": -1}},
            ]
        )

    if limit:
        pipeline.append({"$limit": limit})

    pipeline.append({"$project": {"_ts": 0}})

    cursor = devices_data_collection.aggregate(pipeline)
    return list(cursor)


def get_latest_by_uid(uid: str):
    cursor = (
        devices_data_collection
        .find({"device_id": uid})
        .sort("timestamp", -1)
        .limit(1)
    )
    items = list(cursor)
    return items[0] if items else None
