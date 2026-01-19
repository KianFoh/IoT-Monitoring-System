from datetime import datetime, timezone

def utc_now() -> datetime:
    """Timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)