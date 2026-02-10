import { api } from "@/services/api";

export type BrandingResponse = {
  distributor_id?: number | null;
  distributor_name?: string | null;
  logo_url?: string | null;
  is_default: boolean;
};

export async function fetchBranding(hostname: string) {
  const params = new URLSearchParams({ host: hostname });
  return api.get<BrandingResponse>(`/distributors/branding?${params.toString()}`);
}
