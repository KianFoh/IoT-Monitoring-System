export type DevicePayload = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalizeTimestampString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  if (hasTimezone) return trimmed;
  const normalized = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed;
  return `${normalized}Z`;
};

const parseTimestamp = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const normalized = normalizeTimestampString(value);
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
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
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== null && item !== undefined);
    if (
      entries.length > 0 &&
      entries.every(([, item]) => ["string", "number", "boolean"].includes(typeof item))
    ) {
      return entries.map(([key, item]) => `${key}: ${String(item)}`).join(", ");
    }
    return JSON.stringify(value);
  }
  return String(value);
};
