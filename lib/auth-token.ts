export const AUTH_TOKEN_KEY = "monitor_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredToken() {
  if (!isBrowser()) return "";
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setStoredToken(token: string) {
  if (!isBrowser()) return;

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function clearStoredToken() {
  if (!isBrowser()) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const value = auth.trim();

  if (!value) return "";

  if (/^Bearer\s+/i.test(value)) {
    return value.replace(/^Bearer\s+/i, "").trim();
  }

  return value;
}
