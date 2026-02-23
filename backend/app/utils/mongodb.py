
def serialize_document(doc: dict) -> dict:
    """Convert ObjectId to string without mutating the original document."""
    data = dict(doc)
    if "_id" in data:
        data["_id"] = str(data["_id"])
    return data
