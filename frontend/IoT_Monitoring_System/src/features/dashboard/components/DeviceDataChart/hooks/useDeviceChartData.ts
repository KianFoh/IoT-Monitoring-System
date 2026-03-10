import { useEffect, useMemo, useRef, useState } from "react";
import { devicesApi } from "../../../api/devicesApi";
import type {
  ChartFilterMode,
  ChartRangePreset,
  DataFieldType,
  LineGranularity,
} from "../types/deviceDataChartTypes";
import { getCustomRangeLimitEnd, parseNumericValue } from "../utils/deviceDataChartUtils";
import { getRangeGranularity } from "../utils/deviceChartHelpers";

type DeviceDataRecord = {
  ts?: string | number | Date;
  data?: Record<string, unknown>;
};

type TimeWindow = { start: string; end: string; granularity: LineGranularity };

type UseDeviceChartDataParams = {
  deviceUid: string;
  filterMode: ChartFilterMode;
  rawTimestamp?: Date | null;
  getChartValue?: (field: string) => unknown;
  availableFields: string[];
  maxRawGapMs: number | null;
  rangePreset: ChartRangePreset;
  timeGranularity: LineGranularity;
  timeStart: string;
  timeEnd: string;
  rangeRefreshMs: number;
  getChartType?: (field: string) => DataFieldType;
  suspendLive?: boolean;
};

const LINE_BUFFER_LIMIT = 20;

const buildRangeWindow = (preset: ChartRangePreset) => {
  const end = new Date();
  const start = new Date(end.getTime());
  switch (preset) {
    case "last_1_min":
      start.setMinutes(start.getMinutes() - 1);
      break;
    case "last_1_hour":
      start.setHours(start.getHours() - 1);
      break;
    case "last_1_day":
      start.setDate(start.getDate() - 1);
      break;
    case "last_1_week":
      start.setDate(start.getDate() - 7);
      break;
    case "last_1_month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "last_1_year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setHours(start.getHours() - 1);
  }
  return { start, end };
};

const parseApiTimestamp = (value: DeviceDataRecord["ts"]) => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
    const normalized = hasTimezone
      ? trimmed
      : `${trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed}Z`;
    const parsed = new Date(normalized);
    const time = parsed.getTime();
    return Number.isFinite(time) ? time : null;
  }
  return null;
};

const toIsoString = (value: string, { endOfDay = false } = {}) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    const localTime = new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
    const time = localTime.getTime();
    if (!Number.isFinite(time)) return null;
    return localTime.toISOString();
  }
  const parsed = new Date(trimmed);
  const time = parsed.getTime();
  if (!Number.isFinite(time)) return null;
  return parsed.toISOString();
};

export const useDeviceChartData = ({
  deviceUid,
  filterMode,
  rawTimestamp,
  getChartValue,
  availableFields,
  maxRawGapMs,
  rangePreset,
  timeGranularity,
  timeStart,
  timeEnd,
  rangeRefreshMs,
  getChartType,
  suspendLive = false,
}: UseDeviceChartDataParams) => {
  const [rawSeries, setRawSeries] = useState<Array<{ ts: number; data: Record<string, unknown> }>>(
    []
  );
  const [filteredRawData, setFilteredRawData] = useState<
    Array<{ ts: number; data: Record<string, unknown> }>
  >([]);
  const [filteredLatestValues, setFilteredLatestValues] = useState<Record<string, unknown>>({});
  const [rangeRefreshToken, setRangeRefreshToken] = useState(0);
  const getChartTypeRef = useRef(getChartType);

  useEffect(() => {
    getChartTypeRef.current = getChartType;
  }, [getChartType]);

  useEffect(() => {
    if (suspendLive) return;
    if (!rawTimestamp || filterMode !== "raw" || !getChartValue) return;
    const timestamp = rawTimestamp.getTime();
    if (!Number.isFinite(timestamp)) return;
    if (!availableFields.length) return;
    const rowData: Record<string, unknown> = {};
    let hasValue = false;
    availableFields.forEach((field) => {
      const value = getChartValue(field);
      if (value === undefined || value === null) return;
      rowData[field] = value;
      hasValue = true;
    });
    if (!hasValue) return;
    setRawSeries((prev) => {
      let next = prev;
      if (prev.length && maxRawGapMs !== null) {
        const lastTs = prev[prev.length - 1]?.ts;
        if (Number.isFinite(lastTs) && timestamp - lastTs > maxRawGapMs) {
          next = [];
        }
      }
      if (next.length && next[next.length - 1].ts === timestamp) {
        next = [...next.slice(0, -1), { ts: timestamp, data: rowData }];
      } else {
        next = [...next, { ts: timestamp, data: rowData }];
      }
      if (next.length > LINE_BUFFER_LIMIT) {
        next = next.slice(next.length - LINE_BUFFER_LIMIT);
      }
      return next;
    });
  }, [rawTimestamp, filterMode, getChartValue, availableFields, maxRawGapMs, suspendLive]);

  useEffect(() => {
    if (filterMode === "raw") return;
    setRawSeries([]);
  }, [filterMode]);

  const rangeWindow = useMemo<TimeWindow | null>(() => {
    if (filterMode !== "range") return null;
    const window = buildRangeWindow(rangePreset);
    return {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      granularity: getRangeGranularity(rangePreset),
    };
  }, [filterMode, rangePreset, rangeRefreshToken]);

  const customWindow = useMemo<TimeWindow | "invalid" | null>(() => {
    if (filterMode !== "custom") return null;
    const startIso = toIsoString(timeStart);
    const endIso = toIsoString(timeEnd, { endOfDay: true });
    if (!startIso || !endIso) return "invalid";
    const startTime = new Date(startIso).getTime();
    const endTime = new Date(endIso).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return "invalid";
    if (startTime > endTime) return "invalid";
    const maxCustomRangeEnd = getCustomRangeLimitEnd(startTime, timeGranularity);
    if (maxCustomRangeEnd !== null && endTime > maxCustomRangeEnd) return "invalid";
    return { start: startIso, end: endIso, granularity: timeGranularity };
  }, [filterMode, timeStart, timeEnd, timeGranularity]);

  useEffect(() => {
    if (filterMode === "raw") {
      setFilteredRawData([]);
      setFilteredLatestValues({});
      return;
    }
    if (!deviceUid) {
      setFilteredRawData([]);
      setFilteredLatestValues({});
      return;
    }

    let cancelled = false;
    const params: { start?: string; end?: string; granularity?: string } = {};

    if (filterMode === "range") {
      if (!rangeWindow) {
        setFilteredRawData([]);
        setFilteredLatestValues({});
        return;
      }
      params.start = rangeWindow.start;
      params.end = rangeWindow.end;
      params.granularity = rangeWindow.granularity;
    } else if (filterMode === "custom") {
      if (!customWindow || customWindow === "invalid") {
        setFilteredRawData([]);
        setFilteredLatestValues({});
        return;
      }
      params.start = customWindow.start;
      params.end = customWindow.end;
      params.granularity = customWindow.granularity;
    }

    devicesApi
      .data(deviceUid, params)
      .then((rows) => {
        if (cancelled) return;
        const records = Array.isArray(rows) ? (rows as DeviceDataRecord[]) : [];
        const parsedRows = records
          .map((row) => {
            const ts = parseApiTimestamp(row.ts);
            if (ts === null) return null;
            const data = row.data && typeof row.data === "object" ? row.data : {};
            return { ts, data };
          })
          .filter((row): row is { ts: number; data: Record<string, unknown> } => Boolean(row));

        const orderedRows = [...parsedRows].sort((a, b) => a.ts - b.ts);
        const latestValues: Record<string, unknown> = {};
        for (let i = orderedRows.length - 1; i >= 0; i -= 1) {
          const row = orderedRows[i];
          Object.entries(row.data).forEach(([key, value]) => {
            if (key in latestValues) return;
            const numeric = parseNumericValue(value);
            if (numeric !== null) {
              latestValues[key] = numeric;
              return;
            }
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              latestValues[key] = value;
              return;
            }
            const fieldType = getChartTypeRef.current?.(key);
            if (
              fieldType === "list" &&
              (Array.isArray(value) || (value && typeof value === "object"))
            ) {
              latestValues[key] = value;
            }
          });
        }
        setFilteredRawData(orderedRows);
        setFilteredLatestValues(latestValues);
      })
      .catch(() => {
        if (cancelled) return;
        setFilteredRawData([]);
        setFilteredLatestValues({});
      });

    return () => {
      cancelled = true;
    };
  }, [deviceUid, filterMode, rangeWindow, customWindow]);

  useEffect(() => {
    if (filterMode !== "range") return;
    if (!deviceUid) return;
    if (!Number.isFinite(rangeRefreshMs) || rangeRefreshMs <= 0) return;
    const intervalId = window.setInterval(() => {
      setRangeRefreshToken((prev) => prev + 1);
    }, rangeRefreshMs);
    return () => window.clearInterval(intervalId);
  }, [filterMode, deviceUid, rangeRefreshMs]);

  return { rawSeries, filteredRawData, filteredLatestValues };
};
