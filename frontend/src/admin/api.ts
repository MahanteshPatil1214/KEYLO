import { API_BASE_URL, ApiError } from "../auth/api";
import { getSession } from "../auth/session";
import type {
  AdminRoleName,
  CreateUserPayload,
  UpdateUserPayload,
  UserItem,
  UserListResponse,
  UserMetrics,
} from "./adminModel";
import type {
  AdminFactStatus,
  AdminProjectStatus,
  CreateFactPayload,
  CreateProjectPayload,
  FactItem,
  FactListResponse,
  FactVersionListResponse,
  ProjectItem,
  ProjectListResponse,
  ProjectMetrics,
  UpdateFactPayload,
  UpdateProjectPayload,
} from "./projectModel";
import type {
  AdminBookingStatus,
  BookingItem,
  BookingListResponse,
  BookingMetrics,
  CancelBookingPayload,
  CreateSlotPayload,
  RescheduleBookingPayload,
  UpdateBookingStatusPayload,
  UpdateSlotPayload,
  VisitSlotItem,
  VisitSlotListResponse,
} from "./visitModel";

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

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorBody = payload?.error ?? payload ?? {};
    let message = errorBody.message || "An unexpected error occurred.";

    // If details are present, combine them
    if (Array.isArray(errorBody.details) && errorBody.details.length > 0) {
      const detailsMsg = errorBody.details
        .map((d: any) => d.message || d.msg || "")
        .filter(Boolean)
        .join(", ");
      if (detailsMsg) {
        message = `${message}: ${detailsMsg}`;
      }
    }

    throw new ApiError(
      response.status,
      errorBody.code || `HTTP_${response.status}`,
      message,
      Array.isArray(errorBody.details) ? errorBody.details : undefined,
    );
  }

  return payload as T;
}

export async function fetchAdminProfile(): Promise<UserItem> {
  return authenticatedRequest<UserItem>("/auth/me");
}

export async function fetchUserMetrics(): Promise<UserMetrics> {
  return authenticatedRequest<UserMetrics>("/users/metrics");
}

export type FetchUsersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: AdminRoleName | "ALL";
  status?: "ALL" | "ACTIVE" | "DEACTIVATED";
};

export async function fetchUsers(
  params: FetchUsersParams = {},
): Promise<UserListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.role && params.role !== "ALL") query.set("role", params.role);
  if (params.status === "ACTIVE") query.set("is_active", "true");
  if (params.status === "DEACTIVATED") query.set("is_active", "false");

  const queryString = query.toString();
  return authenticatedRequest<UserListResponse>(
    queryString ? `/users?${queryString}` : "/users",
  );
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserItem> {
  return authenticatedRequest<UserItem>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  userId: string,
  payload: UpdateUserPayload,
): Promise<UserItem> {
  return authenticatedRequest<UserItem>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean,
): Promise<UserItem> {
  return authenticatedRequest<UserItem>(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

// ---------------------------------------------------------------------------
// Projects & Fact Sheets Endpoints
// ---------------------------------------------------------------------------

export async function fetchProjectMetrics(): Promise<ProjectMetrics> {
  return authenticatedRequest<ProjectMetrics>("/projects/metrics");
}

export type FetchProjectsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminProjectStatus | "ALL";
};

export async function fetchProjects(
  params: FetchProjectsParams = {},
): Promise<ProjectListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status && params.status !== "ALL") query.set("status", params.status);

  const queryString = query.toString();
  return authenticatedRequest<ProjectListResponse>(
    queryString ? `/projects?${queryString}` : "/projects",
  );
}

export async function fetchProject(projectId: string): Promise<ProjectItem> {
  return authenticatedRequest<ProjectItem>(`/projects/${projectId}`);
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectItem> {
  return authenticatedRequest<ProjectItem>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<ProjectItem> {
  return authenticatedRequest<ProjectItem>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type FetchFactsParams = {
  page?: number;
  pageSize?: number;
  status?: AdminFactStatus | "ALL";
  category?: string;
};

export async function fetchProjectFacts(
  projectId: string,
  params: FetchFactsParams = {},
): Promise<FactListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.category && params.category !== "ALL") query.set("category", params.category);

  const queryString = query.toString();
  return authenticatedRequest<FactListResponse>(
    queryString
      ? `/projects/${projectId}/facts?${queryString}`
      : `/projects/${projectId}/facts`,
  );
}

export async function createFact(
  projectId: string,
  payload: CreateFactPayload,
): Promise<FactItem> {
  return authenticatedRequest<FactItem>(`/projects/${projectId}/facts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFact(
  factId: string,
  payload: UpdateFactPayload,
): Promise<FactItem> {
  return authenticatedRequest<FactItem>(`/facts/${factId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function approveFact(factId: string): Promise<FactItem> {
  return authenticatedRequest<FactItem>(`/facts/${factId}/approve`, {
    method: "POST",
  });
}

export async function rejectFact(factId: string): Promise<FactItem> {
  return authenticatedRequest<FactItem>(`/facts/${factId}/reject`, {
    method: "POST",
  });
}

export async function fetchFactVersions(
  factId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<FactVersionListResponse> {
  return authenticatedRequest<FactVersionListResponse>(
    `/facts/${factId}/versions?page=${page}&page_size=${pageSize}`,
  );
}

// ===========================================================================
// Visits & Availability API
// ===========================================================================

export async function fetchBookingMetrics(): Promise<BookingMetrics> {
  return authenticatedRequest<BookingMetrics>("/bookings/metrics");
}

export type FetchBookingsParams = {
  page?: number;
  pageSize?: number;
  projectId?: string;
  leadId?: string;
  status?: AdminBookingStatus | "ALL";
  search?: string;
};

export async function fetchBookings(
  params: FetchBookingsParams = {},
): Promise<BookingListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.projectId && params.projectId !== "ALL") query.set("project_id", params.projectId);
  if (params.leadId) query.set("lead_id", params.leadId);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.search) query.set("search", params.search.trim());

  const queryString = query.toString();
  return authenticatedRequest<BookingListResponse>(
    queryString ? `/bookings?${queryString}` : "/bookings",
  );
}

export async function fetchBooking(bookingId: string): Promise<BookingItem> {
  return authenticatedRequest<BookingItem>(`/bookings/${bookingId}`);
}

export async function cancelBooking(
  bookingId: string,
  payload: CancelBookingPayload = {},
): Promise<BookingItem> {
  return authenticatedRequest<BookingItem>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function rescheduleBooking(
  bookingId: string,
  payload: RescheduleBookingPayload,
): Promise<BookingItem> {
  return authenticatedRequest<BookingItem>(`/bookings/${bookingId}/reschedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBookingStatus(
  bookingId: string,
  payload: UpdateBookingStatusPayload,
): Promise<BookingItem> {
  return authenticatedRequest<BookingItem>(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type FetchSlotsParams = {
  page?: number;
  pageSize?: number;
  projectId?: string;
  isActive?: boolean;
  fromTime?: string;
  toTime?: string;
};

export async function fetchSlots(
  params: FetchSlotsParams = {},
): Promise<VisitSlotListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.projectId && params.projectId !== "ALL") query.set("project_id", params.projectId);
  if (params.isActive !== undefined) query.set("is_active", String(params.isActive));
  if (params.fromTime) query.set("from_time", params.fromTime);
  if (params.toTime) query.set("to_time", params.toTime);

  const queryString = query.toString();
  return authenticatedRequest<VisitSlotListResponse>(
    queryString ? `/slots?${queryString}` : "/slots",
  );
}

export async function fetchSlot(slotId: string): Promise<VisitSlotItem> {
  return authenticatedRequest<VisitSlotItem>(`/slots/${slotId}`);
}

export async function createSlot(
  payload: CreateSlotPayload,
): Promise<VisitSlotItem> {
  return authenticatedRequest<VisitSlotItem>("/slots", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSlot(
  slotId: string,
  payload: UpdateSlotPayload,
): Promise<VisitSlotItem> {
  return authenticatedRequest<VisitSlotItem>(`/slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deactivateSlot(slotId: string): Promise<VisitSlotItem> {
  return authenticatedRequest<VisitSlotItem>(`/slots/${slotId}`, {
    method: "DELETE",
  });
}

