import type { Device } from "@/types/device";

// Match DevicePipeline.device_topic: department is only used in internal topics.
export function getDeviceMqttTopic(device: Device): string | null {
  const customer = (device.customer_mqtt_topic || device.customer_name || "").trim().toLowerCase();
  const distributor = (device.distributor_mqtt_topic || device.distributor_name || "").trim().toLowerCase();
  if (!customer || !device.uid) return null;

  const prefix = distributor ? `${distributor}/${customer}` : customer;
  return `${prefix}/json/send/${device.uid}/`;
}
