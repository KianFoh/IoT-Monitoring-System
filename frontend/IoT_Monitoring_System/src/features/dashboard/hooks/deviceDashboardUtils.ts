export type DevicePayload = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parseTimestamp = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const extractPayloadInfo = (
  payload: unknown
): { data: DevicePayload | null; timestamp: Date | null } => {
  if (!isRecord(payload)) return { data: null, timestamp: null };
  const payloadData = (payload as { data?: unknown }).data;
  const timestamp = parseTimestamp(
    (payload as { ts?: unknown; timestamp?: unknown }).ts ??
      (payload as { ts?: unknown; timestamp?: unknown }).timestamp
  );
  if (isRecord(payloadData)) {
    return { data: payloadData, timestamp };
  }
  const copy: DevicePayload = { ...payload };
  delete copy._id;
  delete copy.device_id;
  delete copy.ts;
  delete copy.timestamp;
  return { data: Object.keys(copy).length ? copy : null, timestamp };
};

export const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
