export type AdminProjectStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type AdminFactStatus = "DRAFT" | "APPROVED";

export type ProjectItem = {
  id: string;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  rera_number: string | null;
  status: AdminProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponse = {
  items: ProjectItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type ProjectMetrics = {
  total_projects: number;
  active_projects: number;
  draft_projects: number;
  inactive_projects: number;
  total_facts: number;
  approved_facts: number;
  draft_facts: number;
};

export type PendingFactChanges = {
  category: string;
  question: string;
  answer: string;
};

export type FactItem = {
  id: string;
  project_id: string;
  category: string;
  question: string;
  answer: string;
  status: AdminFactStatus;
  updated_by: string | null;
  pending_changes?: PendingFactChanges | null;
  created_at: string;
  updated_at: string;
};

export type FactListResponse = {
  items: FactItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type FactVersionItem = {
  id: string;
  fact_id: string;
  previous_answer: string | null;
  new_answer: string;
  version_number: number;
  changed_by: string;
  created_at: string;
};

export type FactVersionListResponse = {
  items: FactVersionItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type CreateProjectPayload = {
  name: string;
  slug?: string | null;
  location: string;
  description?: string | null;
  rera_number?: string | null;
  status: AdminProjectStatus;
};

export type UpdateProjectPayload = {
  name?: string;
  slug?: string;
  location?: string;
  description?: string | null;
  rera_number?: string | null;
  status?: AdminProjectStatus;
};

export type CreateFactPayload = {
  category: string;
  question: string;
  answer: string;
};

export type UpdateFactPayload = {
  category?: string;
  question?: string;
  answer?: string;
};

export const STANDARD_FACT_CATEGORIES = [
  "AMENITIES",
  "CONFIGURATIONS",
  "LOCATION & CONNECTIVITY",
  "PRICING & PAYMENT",
  "APPROVALS & RERA",
  "SPECIFICATIONS",
  "DEVELOPER BACKGROUND",
  "POSSESSION & TIMELINE",
  "GENERAL FAQS",
] as const;

