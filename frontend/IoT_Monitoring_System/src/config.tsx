const PORT = import.meta.env.VITE_PORT || '3000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = import.meta.env.VITE_API_REQUEST_TIMEOUT || '5000';
const APP_NAME = import.meta.env.VITE_APP_NAME || 'IoT Monitoring System';

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: parseInt(API_TIMEOUT),
  },
  app: {
    name: APP_NAME,
    port: parseInt(PORT),
  },
};

export default config;