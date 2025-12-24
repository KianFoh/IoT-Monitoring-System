
def serialize_document(doc):
    doc["_id"] = str(doc["_id"])  # Convert ObjectId to string
    return doc