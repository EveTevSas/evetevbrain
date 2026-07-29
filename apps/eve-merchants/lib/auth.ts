const KEY = "evepay_api_key";
const MERCHANT_KEY = "evepay_merchant";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setSession(apiKey: string, merchant: { id: string; legalName: string; estado: string }): void {
  localStorage.setItem(KEY, apiKey);
  localStorage.setItem(MERCHANT_KEY, JSON.stringify(merchant));
}

export function getMerchant(): { id: string; legalName: string; estado: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(MERCHANT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as { id: string; legalName: string; estado: string }; } catch { return null; }
}

export function logout(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(MERCHANT_KEY);
}
