/** Demo-only credentials for the internal prototype. Not real authentication. */
export const DEMO_EMAIL = "kini@test.com";
export const DEMO_PASSWORD = "kini2026";

const SESSION_KEY = "kini-plans-portal-auth";

export function isAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAuthenticated(value: boolean) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore storage errors in restricted environments */
  }
}
