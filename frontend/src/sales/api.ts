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

export type SalesProjectStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export type SalesProject = {
  id: string;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  rera_number: string | null;
  status: SalesProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponse = {
  items: SalesProject[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type LeadAssignment = {
  id: string;
  lead_id: string;
  executive_id: string;
  assigned_by: string;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
};

export type LeadAssignmentListResponse = {
  items: LeadAssignment[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type ConversationStatus = "ACTIVE" | "CLOSED" | "ARCHIVED";

export type SalesConversation = {
  id: string;
  lead_id: string;
  project_id: string;
  buyer_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
};

export type ConversationListResponse = {
  items: SalesConversation[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type MessageSenderType =
  | "BUYER"
  | "ASSISTANT"
  | "SALES_EXECUTIVE"
  | "SYSTEM";

export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export type SalesMessage = {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  content: string;
  status: MessageStatus;
  created_at: string;
};

export type MessageListResponse = {
  items: SalesMessage[];
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

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

const MAX_PAGE_REQUESTS = 50;

async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
  maxPages = MAX_PAGE_REQUESTS,
): Promise<T[]> {
  const first = await fetchPage(1);
  const totalPages = Math.min(first.pages, maxPages);
  const items = [...first.items];

  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        fetchPage(index + 2),
      ),
    );
    for (const response of remaining) {
      items.push(...response.items);
    }
  }

  return items;
}

export type LeadListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  projectId?: string;
  source?: LeadSource;
  status?: LeadStatus;
  assignedExecutiveId?: string;
  order?: "asc" | "desc";
};

export function fetchLeads(query: LeadListQuery = {}): Promise<LeadListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("page_size", String(query.pageSize ?? 100));
  params.set("order", query.order ?? "desc");
  if (query.search) params.set("search", query.search);
  if (query.projectId) params.set("project_id", query.projectId);
  if (query.source) params.set("source", query.source);
  if (query.status) params.set("status", query.status);
  if (query.assignedExecutiveId) {
    params.set("assigned_executive_id", query.assignedExecutiveId);
  }
  return authenticatedRequest<LeadListResponse>(`/leads?${params.toString()}`);
}

export function fetchAllAssignedLeads(): Promise<SalesLead[]> {
  return collectAllPages((page) => fetchLeads({ page, pageSize: 100 }));
}

export function fetchLeadDetail(leadId: string): Promise<SalesLead> {
  return authenticatedRequest<SalesLead>(`/leads/${leadId}`);
}

export function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<SalesLead> {
  return authenticatedRequest<SalesLead>(`/leads/${leadId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function fetchLeadAssignmentsPage(
  leadId: string,
  page = 1,
  pageSize = 100,
): Promise<LeadAssignmentListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return authenticatedRequest<LeadAssignmentListResponse>(
    `/leads/${leadId}/assignments?${params.toString()}`,
  );
}

export function fetchAllLeadAssignments(
  leadId: string,
): Promise<LeadAssignment[]> {
  return collectAllPages((page) =>
    fetchLeadAssignmentsPage(leadId, page, 100),
  );
}

export function fetchProjectsPage(
  page = 1,
  pageSize = 100,
): Promise<ProjectListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return authenticatedRequest<ProjectListResponse>(
    `/projects?${params.toString()}`,
  );
}

export function fetchAllProjects(): Promise<SalesProject[]> {
  return collectAllPages((page) => fetchProjectsPage(page, 100));
}

export function fetchConversationsPage(options: {
  page?: number;
  pageSize?: number;
  leadId?: string;
  projectId?: string;
  status?: ConversationStatus;
} = {}): Promise<ConversationListResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 100),
  });
  if (options.leadId) params.set("lead_id", options.leadId);
  if (options.projectId) params.set("project_id", options.projectId);
  if (options.status) params.set("status", options.status);
  return authenticatedRequest<ConversationListResponse>(
    `/conversations?${params.toString()}`,
  );
}

export function fetchAllConversations(): Promise<SalesConversation[]> {
  return collectAllPages((page) =>
    fetchConversationsPage({ page, pageSize: 100 }),
  );
}

export function fetchAllLeadConversations(
  leadId: string,
): Promise<SalesConversation[]> {
  return collectAllPages((page) =>
    fetchConversationsPage({ page, pageSize: 100, leadId }),
  );
}

export function fetchMessagesPage(
  conversationId: string,
  page = 1,
  pageSize = 100,
  order: "asc" | "desc" = "asc",
): Promise<MessageListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    order,
  });
  return authenticatedRequest<MessageListResponse>(
    `/conversations/${conversationId}/messages?${params.toString()}`,
  );
}

export async function fetchAllConversationMessages(
  conversationId: string,
): Promise<SalesMessage[]> {
  const messages = await collectAllPages((page) =>
    fetchMessagesPage(conversationId, page, 100, "asc"),
  );
  return messages.sort(
    (left, right) =>
      new Date(left.created_at).getTime() -
      new Date(right.created_at).getTime(),
  );
}

export function fetchBookingsPage(options: {
  page?: number;
  pageSize?: number;
  leadId?: string;
  projectId?: string;
  status?: BookingStatus;
} = {}): Promise<BookingListResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 100),
  });
  if (options.leadId) params.set("lead_id", options.leadId);
  if (options.projectId) params.set("project_id", options.projectId);
  if (options.status) params.set("status", options.status);
  return authenticatedRequest<BookingListResponse>(
    `/bookings?${params.toString()}`,
  );
}

export function fetchAllBookings(): Promise<SalesBooking[]> {
  return collectAllPages((page) => fetchBookingsPage({ page, pageSize: 100 }));
}

export function fetchAllLeadBookings(leadId: string): Promise<SalesBooking[]> {
  return collectAllPages((page) =>
    fetchBookingsPage({ page, pageSize: 100, leadId }),
  );
}

export function fetchHandoffsPage(options: {
  page?: number;
  pageSize?: number;
  leadId?: string;
  projectId?: string;
} = {}): Promise<HandoffListResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.pageSize ?? 100),
  });
  if (options.leadId) params.set("lead_id", options.leadId);
  if (options.projectId) params.set("project_id", options.projectId);
  return authenticatedRequest<HandoffListResponse>(
    `/handoffs?${params.toString()}`,
  );
}

export function fetchAllHandoffs(): Promise<SalesHandoff[]> {
  return collectAllPages((page) => fetchHandoffsPage({ page, pageSize: 100 }));
}

export function fetchAllLeadHandoffs(leadId: string): Promise<SalesHandoff[]> {
  return collectAllPages((page) =>
    fetchHandoffsPage({ page, pageSize: 100, leadId }),
  );
}

export type LeadEnquiryHistory = {
  assignments: LeadAssignment[];
  conversations: SalesConversation[];
  messagesByConversation: Record<string, SalesMessage[]>;
  bookings: SalesBooking[];
  handoffs: SalesHandoff[];
};

export async function fetchLeadEnquiryHistory(
  leadId: string,
): Promise<LeadEnquiryHistory> {
  const [assignments, conversations, bookings, handoffs] = await Promise.all([
    fetchAllLeadAssignments(leadId),
    fetchAllLeadConversations(leadId),
    fetchAllLeadBookings(leadId),
    fetchAllLeadHandoffs(leadId),
  ]);

  const messageLists = await Promise.all(
    conversations.map((conversation) =>
      fetchAllConversationMessages(conversation.id),
    ),
  );

  const messagesByConversation: Record<string, SalesMessage[]> = {};
  conversations.forEach((conversation, index) => {
    messagesByConversation[conversation.id] = messageLists[index] ?? [];
  });

  return {
    assignments,
    conversations,
    messagesByConversation,
    bookings,
    handoffs,
  };
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

// ─── Conversation mutations ───────────────────────────────────────────────────

export function sendSalesMessage(
  conversationId: string,
  content: string,
): Promise<SalesMessage> {
  return authenticatedRequest<SalesMessage>(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content, sender_type: "SALES_EXECUTIVE" }),
    },
  );
}

export function updateConversationStatus(
  conversationId: string,
  status: ConversationStatus,
): Promise<SalesConversation> {
  return authenticatedRequest<SalesConversation>(
    `/conversations/${conversationId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

// ─── Handoff mutations ────────────────────────────────────────────────────────

export function updateHandoffStatus(
  handoffId: string,
  status: HandoffStatus,
  resolutionNotes?: string,
): Promise<SalesHandoff> {
  return authenticatedRequest<SalesHandoff>(`/handoffs/${handoffId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
  });
}
