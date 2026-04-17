const STORAGE_KEY = "ols.clientId";

function loadOrCreate(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

export const CLIENT_ID = loadOrCreate();
