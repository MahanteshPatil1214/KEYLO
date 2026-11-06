import { API_BASE_URL, ApiError } from "../auth/api";
import { getSession } from "../auth/session";

export type RoleInfo = {
  id: string;
  name: string;
  description: string | null;
};

export type SalesProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: RoleInfo;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadSource =
  | "WEBSITE"
  | "PROPERTY_PORTAL"
  | "SOCIAL_MEDIA"
  | "HOARDING"
  | "REFERRAL"
  | "OTHER";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "NOT_INTERESTED"
  | "VISIT_BOOKED"
  | "VISIT_CANCELLED"
  | "VISITED"
  | "CONVERTED"
  | "LOST";

export type SalesLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  project_id: string;
  source: LeadSource;
  status: LeadStatus;
  budget_min: number | null;
  budget_max: number | null;
  preferred_configuration: string | null;
  consent_to_contact: boolean;
  assigned_executive_id: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadListResponse = {
  items: SalesLead[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type SourceLeadCount = {
  source: LeadSource;
  leads: number;
};

export type DashboardSummary = {
  scope: "ADMIN" | "SALES_EXECUTIVE";
  filters: {
    date_from: string | null;
    date_to: string | null;
    project_id: string | null;
  };
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

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type SalesBooking = {
  id: string;
  slot_id: string;
  lead_id: string;
  project_id: string;
  buyer_id: string;
  executive_id: string | null;
  status: BookingStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_email: string | null;
  slot_start_time: string;
  slot_end_time: string;
};

export type BookingListResponse = {
  items: SalesBooking[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type HandoffStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CANCELLED";

export type SalesHandoff = {
  id: string;
  conversation_id: string;
  lead_id: string;
  project_id: string;
  project_name: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  executive_id: string | null;
  executive_name: string | null;
  executive_email: string | null;
  created_by_id: string | null;
  status: HandoffStatus;
  reason: string;
  summary: string;
  resolution_notes: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  resolved_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type HandoffListResponse = {
  items: SalesHandoff[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type NotificationType =
  | "LEAD_ASSIGNED"
  | "HANDOFF_ASSIGNED"
  | "HANDOFF_STATUS_UPDATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "VISIT_REMINDER_24H"
  | "VISIT_REMINDER_2H"
  | "SYSTEM";

export type SalesNotification = {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  lead_id: string | null;
  booking_id: string | null;
  handoff_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationListResponse = {
  items: SalesNotification[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export type MarkAllReadResponse = {
  updated_count: number;
};

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = getSession();
  if (!session?.accessToken) {
    throw new ApiError(401, "UNAUTHORIZED", "Active session required.");
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "REQUEST_ABORTED", "The request took too long.");
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Failed to communicate with Keylo backend.",
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorBody = payload as
      | { error?: { code?: string; message?: string } }
      | null;
    const code = errorBody?.error?.code || "HTTP_ERROR";
    const message =
      errorBody?.error?.message || "An unexpected error occurred.";
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
}

export function fetchSalesProfile(): Promise<SalesProfile> {
  return authenticatedRequest<SalesProfile>("/auth/me");
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return authenticatedRequest<DashboardSummary>("/dashboard/summary");
}

export function fetchNewLeads(pageSize = 5): Promise<LeadListResponse> {
  const query = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
    status: "NEW",
    order: "desc",
  });
  return authenticatedRequest<LeadListResponse>(`/leads?${query.toString()}`);
}

export function fetchLeadStatusTotal(status: LeadStatus): Promise<number> {
  const query = new URLSearchParams({
    page: "1",
    page_size: "1",
    status,
  });
  return authenticatedRequest<LeadListResponse>(
    `/leads?${query.toString()}`,
  ).then((response) => response.total);
}

export type PendingFollowUpCounts = {
  contacted: number;
  qualified: number;
  total: number;
};

export async function fetchPendingFollowUpCounts(): Promise<PendingFollowUpCounts> {
  const [contacted, qualified] = await Promise.all([
    fetchLeadStatusTotal("CONTACTED"),
    fetchLeadStatusTotal("QUALIFIED"),
  ]);
  return { contacted, qualified, total: contacted + qualified };
}

export function fetchBookingsByStatus(
  status: Extract<BookingStatus, "PENDING" | "CONFIRMED">,
  pageSize = 100,
): Promise<BookingListResponse> {
  const query = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
    status,
  });
  return authenticatedRequest<BookingListResponse>(
    `/bookings?${query.toString()}`,
  );
}

export function fetchRecentHandoffs(pageSize = 5): Promise<HandoffListResponse> {
  const query = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
  });
  return authenticatedRequest<HandoffListResponse>(
    `/handoffs?${query.toString()}`,
  );
}

export function fetchRecentActivity(
  pageSize = 6,
): Promise<NotificationListResponse> {
  const query = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
  });
  return authenticatedRequest<NotificationListResponse>(
    `/notifications?${query.toString()}`,
  );
}

export function fetchSalesNotifications(
  page = 1,
  pageSize = 50,
): Promise<NotificationListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return authenticatedRequest<NotificationListResponse>(
    `/notifications?${query.toString()}`,
  );
}

export function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return authenticatedRequest<UnreadCountResponse>("/notifications/unread-count");
}

export function markNotificationAsRead(
  notificationId: string,
): Promise<SalesNotification> {
  return authenticatedRequest<SalesNotification>(
    `/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
}

export function markAllNotificationsAsRead(): Promise<MarkAllReadResponse> {
  return authenticatedRequest<MarkAllReadResponse>(
    "/notifications/mark-all-read",
    { method: "POST" },
  );
}
