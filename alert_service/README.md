# Alert Service

Standalone MQTT alert worker for IoT Monitoring System.

It is separate from the backend and ingestion processes. It:

- loads active alert rules from PostgreSQL
- subscribes to processed device data on `internal/devices/processed/#`
- subscribes to alert-rule changes on `internal/devices/alert/#`
- reloads affected device rules in realtime without stopping live data processing
- evaluates rules with cooldown handling
- sends notifications through a pluggable notification service

The `no data` operator works for any field type. Set the rule value to a positive
integer number of seconds. The service starts a timer when it loads the rule,
resets it whenever a processed payload contains that field, and sends an alert
once the timeout expires. If the field remains missing, the rule's cooldown
controls repeat notifications. Restarting the alert service starts active
no-data timers again because field receipt timestamps are held in memory.

Run with its own virtual environment from the repository root:

```powershell
cd alert_service
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python main.py
```

This venv is separate from the backend and ingestion environments.

For now, `email` notifications are logged. SMTP delivery can be added inside `app/notifier.py`.
