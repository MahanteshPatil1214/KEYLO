import { API_BASE_URL, ApiError } from "../auth/api";
import { getSession } from "../auth/session";
import type { SalesLead } from "../sales/api";

export type RoleInfo = {
  id: string;
  name: string;
  description: string | null;
};

export type BuyerProfile = {
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

export type ConversationStatus = "ACTIVE" | "CLOSED" | "ARCHIVED";

export type BuyerConversation = {
  id: string;
  lead_id: string;
  project_id: string;
  buyer_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
};

export type ConversationListResponse = {
  items: BuyerConversation[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type MessageSenderType = "BUYER" | "SALES_EXECUTIVE" | "AI_ASSISTANT" | "SYSTEM";
export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  content: string;
  status: MessageStatus;
  created_at: string;
};

export type MessageListResponse = {
  items: ConversationMessage[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type BuyerBooking = {
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
  items: BuyerBooking[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type ProjectStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type Project = {
  id: string;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  rera_number: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponse = {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type FactStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type ProjectFact = {
  id: string;
  project_id: string;
  category: string;
  question: string;
  answer: string;
  status: FactStatus;
  created_at: string;
  updated_at: string;
};

export type FactListResponse = {
  items: ProjectFact[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type NotificationType =
  | "LEAD_ASSIGNED"
  | "HANDOFF_REQUESTED"
  | "HANDOFF_STATUS_UPDATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "VISIT_REMINDER_24H"
  | "VISIT_REMINDER_2H"
  | "SYSTEM";

export type InAppNotification = {
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
  items: InAppNotification[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export type MarkAllReadResponse = {
  marked_count: number;
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
    throw new ApiError(0, "NETWORK_ERROR", "Failed to communicate with Keylo backend.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorBody = payload as { error?: { code?: string; message?: string } } | null;
    const code = errorBody?.error?.code || "HTTP_ERROR";
    const message = errorBody?.error?.message || "An unexpected error occurred.";
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
}

export function fetchBuyerProfile(): Promise<BuyerProfile> {
  return authenticatedRequest<BuyerProfile>("/auth/me");
}

export function fetchBuyerConversations(
  page = 1,
  pageSize = 20,
): Promise<ConversationListResponse> {
  return authenticatedRequest<ConversationListResponse>(
    `/conversations?page=${page}&page_size=${pageSize}`,
  );
}

export function fetchConversationMessages(
  conversationId: string,
  page = 1,
  pageSize = 50,
): Promise<MessageListResponse> {
  return authenticatedRequest<MessageListResponse>(
    `/conversations/${conversationId}/messages?page=${page}&page_size=${pageSize}&order=asc`,
  );
}

export function fetchBuyerBookings(
  page = 1,
  pageSize = 20,
): Promise<BookingListResponse> {
  return authenticatedRequest<BookingListResponse>(
    `/bookings?page=${page}&page_size=${pageSize}`,
  );
}

export function fetchBuyerProjects(
  page = 1,
  pageSize = 20,
): Promise<ProjectListResponse> {
  return authenticatedRequest<ProjectListResponse>(
    `/projects?page=${page}&page_size=${pageSize}`,
  );
}

export function fetchProjectDetails(projectId: string): Promise<Project> {
  return authenticatedRequest<Project>(`/projects/${projectId}`);
}

export function fetchProjectFacts(
  projectId: string,
  page = 1,
  pageSize = 50,
): Promise<FactListResponse> {
  return authenticatedRequest<FactListResponse>(
    `/projects/${projectId}/facts?page=${page}&page_size=${pageSize}`,
  );
}

export function fetchBuyerNotifications(
  page = 1,
  pageSize = 20,
  isRead?: boolean,
): Promise<NotificationListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (isRead !== undefined) {
    query.set("is_read", String(isRead));
  }
  return authenticatedRequest<NotificationListResponse>(
    `/notifications?${query.toString()}`,
  );
}

export function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return authenticatedRequest<UnreadCountResponse>("/notifications/unread-count");
}

export function markNotificationAsRead(
  notificationId: string,
): Promise<InAppNotification> {
  return authenticatedRequest<InAppNotification>(
    `/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
}

export type ChatResponse = {
  conversation_id: string;
  buyer_message: ConversationMessage;
  assistant_message: ConversationMessage;
  reply: string;
};

export type AvailableSlot = {
  id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available_capacity: number;
  notes: string | null;
};

export type AvailableSlotListResponse = {
  items: AvailableSlot[];
  total: number;
};

export type HandoffStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED";

export type Handoff = {
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
  status: HandoffStatus | string;
  reason: string;
  summary: string;
  resolution_notes: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HandoffListResponse = {
  items: Handoff[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export function markAllNotificationsAsRead(): Promise<MarkAllReadResponse> {
  return authenticatedRequest<MarkAllReadResponse>(
    "/notifications/mark-all-read",
    { method: "POST" },
  );
}

export function sendChatMessage(
  conversationId: string,
  message: string,
): Promise<ChatResponse> {
  return authenticatedRequest<ChatResponse>(
    `/conversations/${conversationId}/chat`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}

export function fetchAvailableSlots(
  projectId: string,
): Promise<AvailableSlotListResponse> {
  return authenticatedRequest<AvailableSlotListResponse>(
    `/slots/available?project_id=${projectId}`,
  );
}

export function createBooking(payload: {
  slot_id: string;
  lead_id: string;
  notes?: string;
}): Promise<BuyerBooking> {
  return authenticatedRequest<BuyerBooking>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestHandoff(payload: {
  conversation_id: string;
  reason?: string;
  notes?: string;
}): Promise<Handoff> {
  return authenticatedRequest<Handoff>("/handoffs", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: payload.conversation_id,
      reason: payload.reason || "BUYER_REQUESTED",
      ...(payload.notes ? { notes: payload.notes } : {}),
    }),
  });
}

export function fetchHandoffs(
  page = 1,
  pageSize = 20,
): Promise<HandoffListResponse> {
  return authenticatedRequest<HandoffListResponse>(
    `/handoffs?page=${page}&page_size=${pageSize}`,
  );
}

export function createBuyerConversation(payload: {
  lead_id: string;
  project_id: string;
  initial_message?: string;
}): Promise<BuyerConversation> {
  return authenticatedRequest<BuyerConversation>("/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function optOutContact(
  leadId: string,
  reason?: string | null,
): Promise<void> {
  return authenticatedRequest(`/leads/${leadId}/opt-out`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }).then(() => undefined);
}

export function fetchBuyerLeads(): Promise<SalesLead[]> {
  return authenticatedRequest<SalesLead[]>("/leads/mine");
}
