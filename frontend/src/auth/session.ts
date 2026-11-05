const ACCESS_TOKEN_KEY = "keylo.auth.access-token";
const EXPIRES_AT_KEY = "keylo.auth.access-token-expires-at";
const REMEMBERED_EMAIL_KEY = "keylo.auth.remembered-email";

export type StoredSession = {
  accessToken: string;
  expiresAt: number;
};

function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The API issues short-lived bearer access tokens without refresh tokens, so
 * the token is kept in tab-scoped storage rather than in persistent storage.
 * "Remember me" persists the email address only, never the token or password.
 */
export function saveSession(accessToken: string, expiresInSeconds: number): void {
  const storage = sessionStorageOrNull();
  if (!storage) return;

  const expiresAt = Date.now() + Math.max(0, expiresInSeconds) * 1000;
  try {
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    storage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  } catch {
    // Storage can be unavailable in restricted browsing modes.
  }
}

export function getSession(): StoredSession | null {
  const storage = sessionStorageOrNull();
  if (!storage) return null;

  try {
    const accessToken = storage.getItem(ACCESS_TOKEN_KEY);
    const expiresAt = Number(storage.getItem(EXPIRES_AT_KEY));

    if (!accessToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearSession();
      return null;
    }

    return { accessToken, expiresAt };
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  const storage = sessionStorageOrNull();
  if (!storage) return;

  try {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(EXPIRES_AT_KEY);
  } catch {
    // Nothing else to do when storage is unavailable.
  }
}

export function getRememberedEmail(): string {
  const storage = localStorageOrNull();
  if (!storage) return "";

  try {
    return storage.getItem(REMEMBERED_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function rememberEmail(email: string): void {
  const storage = localStorageOrNull();
  if (!storage) return;

  try {
    storage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // Remembering the email is a convenience, not a requirement.
  }
}

export function forgetRememberedEmail(): void {
  const storage = localStorageOrNull();
  if (!storage) return;

  try {
    storage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Nothing else to do when storage is unavailable.
  }
}
