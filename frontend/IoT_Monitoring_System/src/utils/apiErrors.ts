const isProd = import.meta.env.MODE === "production";

export const getApiErrorDetail = (err: unknown, fallback: string) => {
  if (isProd) {
    return fallback;
  }
  if (err && typeof err === "object") {
    const response = (err as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
    const message = (err as { message?: string }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};
