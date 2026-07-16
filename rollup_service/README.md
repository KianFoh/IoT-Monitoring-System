# Rollup Service

Standalone MQTT consumer for minute and hourly device data rollups.

The ingestion service owns raw processing, `devices_data`, `devices_latest`, and publishing `internal/devices/processed/...`.
This service owns aggregation into the Mongo rollup collections.

Run from this directory:

```powershell
python -m venv venv
venv\Scripts\activate
pip install --no-deps -r requirements.txt
python main.py
```

The service subscribes to:

- `internal/devices/processed/#` for processed device payloads
- `internal/devices/events/#` for add/update/delete config refreshes

