const PORT = import.meta.env.VITE_PORT || '3000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = import.meta.env.VITE_API_REQUEST_TIMEOUT || '5000';
const APP_NAME = import.meta.env.VITE_APP_NAME || 'IoT Monitoring System';
const CHART_ANIMATION_SEC_RAW = import.meta.env.VITE_CHART_ANIMATION_SEC || '1';

const toNonNegativeNumber = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const CHART_ANIMATION_SEC = toNonNegativeNumber(CHART_ANIMATION_SEC_RAW, 1);

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: parseInt(API_TIMEOUT),
  },
  app: {
    name: APP_NAME,
    port: parseInt(PORT),
  },
  chart: {
    animationSec: CHART_ANIMATION_SEC,
    animationMs: Math.round(CHART_ANIMATION_SEC * 1000),
  },
};

export default config;
