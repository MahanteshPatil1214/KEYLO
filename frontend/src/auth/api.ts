export type RoleName = "BUYER" | "SALES_EXECUTIVE" | "ADMIN";

export type AuthenticatedUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: {
    id: string;
    name: string;
    description: string | null;
  };
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type ErrorDetail = {
  field?: string;
  message?: string;
  type?: string;
};

export type RegisterBuyerRequest = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
};

type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: ErrorDetail[];
  };
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const ROLE_HOME: Record<RoleName, string> = {
  ADMIN: "/admin",
  SALES_EXECUTIVE: "/sales",
  BUYER: "/buyer",
};

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: "Administrator",
  SALES_EXECUTIVE: "Sales executive",
  BUYER: "Buyer",
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function roleFromName(value: string): RoleName | null {
  if (value === "ADMIN" || value === "SALES_EXECUTIVE" || value === "BUYER") {
    return value;
  }
  return null;
}

export function homeForRole(role: RoleName): string {
  return ROLE_HOME[role];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        0,
        "REQUEST_ABORTED",
        "The request took too long. Please try again.",
      );
    }

    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "We couldn't reach Keylo. Check your connection and try again.",
    );
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    const envelope: ErrorEnvelope = isRecord(payload)
      ? (payload as ErrorEnvelope)
      : {};
    const code =
      typeof envelope.error?.code === "string"
        ? envelope.error.code
        : "HTTP_ERROR";
    const message =
      typeof envelope.error?.message === "string"
        ? envelope.error.message
        : "Something went wrong. Please try again.";
    const details = Array.isArray(envelope.error?.details)
      ? envelope.error.details
      : [];

    throw new ApiError(response.status, code, message, details);
  }

  return payload as T;
}

export function registerBuyer(
  input: RegisterBuyerRequest,
): Promise<AuthenticatedUser> {
  const phone = input.phone?.trim();

  return request<AuthenticatedUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      ...(phone ? { phone } : {}),
    }),
  });
}

export function loginRequest(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
}

export function fetchCurrentUser(accessToken: string): Promise<AuthenticatedUser> {
  return request<AuthenticatedUser>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type ResetPasswordRequest = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export function resetPasswordRequest(
  input: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  return request<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      confirm_password: input.confirmPassword,
    }),
  });
}
