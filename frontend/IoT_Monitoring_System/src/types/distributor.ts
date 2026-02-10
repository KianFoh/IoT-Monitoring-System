export interface Distributor {
  id: number;
  name: string;
  phone_no: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  is_deletable: boolean;
}

export interface DistributorListResponse {
  items: Distributor[];
  total: number;
  page: number;
  page_size: number;
}

export interface DistributorSearch {
  id: number;
  name: string;
}
