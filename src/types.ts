export interface Member {
  id: number;
  name: string;
  short_name: string | null;
  role: string;
  email: string | null;
  notion_person_id: string | null;
  active: number;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  excel_name: string | null;
  notion_name: string | null;
  base_price: number;
}

export interface Meta {
  members: Member[];
  products: Product[];
  months: string[];
  notionConfigured: boolean;
  defaultExcelPath: string;
}

export interface Target {
  id: number;
  member_id: number;
  product_id: number;
  month: string;
  contracts: number;
  close_rate: number | null;
  trials: number;
  first_meetings: number;
  member_name: string;
  product_name: string;
  product_code: string;
}

export interface DashboardMemberRow {
  member_id: number;
  name: string;
  role: string;
  target_contracts: number;
  actual_contracts: number;
  target_mrr: number;
  actual_mrr: number;
  calls: number;
  connected: number;
  first_meetings: number;
  faxes: number;
}

export interface DashboardProductRow {
  product_id: number;
  name: string;
  code: string;
  target_contracts: number;
  actual_contracts: number;
  target_mrr: number;
  actual_mrr: number;
}

export interface Dashboard {
  month: string;
  totals: {
    target_contracts: number;
    actual_contracts: number;
    target_mrr: number;
    actual_mrr: number;
    target_first_meetings: number;
    actual_first_meetings: number;
    target_trials: number;
    calls: number;
    connected: number;
  };
  byMember: DashboardMemberRow[];
  byProduct: DashboardProductRow[];
  pipeline: { status: string; count: number; mrr: number }[];
}

export interface Actual {
  id: number;
  member_id: number;
  product_id: number;
  month: string;
  contracts: number;
  mrr: number;
  source: string;
  member_name: string;
  product_name: string;
  product_code: string;
}

export interface ActivityActual {
  id: number;
  member_id: number;
  month: string;
  calls: number;
  connected: number;
  faxes: number;
  first_meetings: number;
  source: string;
  member_name: string;
}

export interface IsTarget {
  id: number;
  month: string;
  channel: string;
  appointments: number;
  calls: number;
  budget: number;
}

export interface IsActual {
  id: number;
  month: string;
  channel: string;
  appointments: number;
  calls: number;
  budget: number;
  note: string | null;
}

export interface SyncLog {
  id: number;
  synced_at: string;
  source: string;
  status: string;
  detail: string;
}
