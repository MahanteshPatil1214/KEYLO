export type DashboardScope = "ADMIN" | "SALES_EXECUTIVE";

export type TrendGranularity = "DAY" | "WEEK" | "MONTH";

export type LeadSource =
  | "WEBSITE"
  | "PROPERTY_PORTAL"
  | "SOCIAL_MEDIA"
  | "HOARDING"
  | "REFERRAL"
  | "OTHER";

export type DashboardFilterResponse = {
  date_from?: string | null;
  date_to?: string | null;
  project_id?: string | null;
};

export type SourceLeadCount = {
  source: LeadSource;
  leads: number;
};

export type DashboardSummary = {
  scope: DashboardScope;
  filters: DashboardFilterResponse;
  total_leads: number;
  new_leads: number;
  assigned_leads: number;
  bookings: number;
  completed_visits: number;
  no_show_visits: number;
  cancelled_bookings: number;
  conversions: number;
  handoffs_total: number;
  handoffs_active: number;
  handoffs_resolved: number;
  average_first_response_seconds: number | null;
  median_first_response_seconds: number | null;
  first_response_sample_size: number;
  lead_to_visit_conversion_rate: number;
  site_visit_show_up_rate: number;
  lead_conversion_rate: number;
  leads_by_source: SourceLeadCount[];
};

export type TrendPoint = {
  period: string;
  leads: number;
  bookings: number;
  completed_visits: number;
  conversions: number;
};

export type DashboardTrends = {
  scope: DashboardScope;
  filters: DashboardFilterResponse;
  granularity: TrendGranularity;
  items: TrendPoint[];
};

export type SourcePerformanceItem = {
  source: LeadSource;
  leads: number;
  new_leads: number;
  assigned_leads: number;
  bookings: number;
  completed_visits: number;
  no_show_visits: number;
  cancelled_bookings: number;
  conversions: number;
  marketing_spend: number;
  cost_per_visit: number | null;
  lead_to_visit_conversion_rate: number;
  site_visit_show_up_rate: number;
  lead_conversion_rate: number;
};

export type SourcePerformanceResponse = {
  scope: DashboardScope;
  filters: DashboardFilterResponse;
  items: SourcePerformanceItem[];
};

export type ExecutivePerformanceItem = {
  executive_id: string;
  full_name: string;
  email: string;
  assigned_leads: number;
  new_leads: number;
  bookings: number;
  completed_visits: number;
  no_show_visits: number;
  cancelled_bookings: number;
  conversions: number;
  handoffs_total: number;
  handoffs_active: number;
  handoffs_resolved: number;
  lead_to_visit_conversion_rate: number;
  site_visit_show_up_rate: number;
  lead_conversion_rate: number;
};

export type ExecutivePerformanceResponse = {
  scope: DashboardScope;
  filters: DashboardFilterResponse;
  items: ExecutivePerformanceItem[];
};

export type MarketingSpendItem = {
  id: string;
  project_id: string | null;
  source: LeadSource;
  period_start: string;
  period_end: string;
  amount: number;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingSpendListResponse = {
  items: MarketingSpendItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type CreateMarketingSpendPayload = {
  source: LeadSource;
  project_id?: string | null;
  period_start: string;
  period_end: string;
  amount: number;
  notes?: string;
};
