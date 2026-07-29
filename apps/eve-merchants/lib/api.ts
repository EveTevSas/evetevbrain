const API = process.env.NEXT_PUBLIC_EVEPAY_API_URL ?? "https://api.evetev.com";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export interface Merchant {
  id: string;
  legalName: string;
  estado: string;
  creadoEn: string;
}

export interface Cobro {
  id: string;
  merchantId: string;
  montoMinor: number;
  moneda: string;
  referencia: string;
  estado: string;
  checkoutUrl?: string;
  creadoEn: string;
}

export interface PaginaCobros {
  items: Cobro[];
  total: number;
  page: number;
  limit: number;
}

export interface Stats {
  total: number;
  aprobados: number;
  fallidos: number;
  pendientes: number;
  montoAprobadoMinor: number;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  activa: boolean;
  secret?: string;
}

export const api = {
  merchants: {
    me: (key: string) => request<Merchant>("/v1/merchants/me", key)
  },
  pagos: {
    stats: (key: string, desde?: string, hasta?: string) => {
      const q = new URLSearchParams();
      if (desde) q.set("desde", desde);
      if (hasta) q.set("hasta", hasta);
      return request<Stats>(`/v1/pagos/stats${q.size ? `?${q}` : ""}`, key);
    },
    listar: (key: string, params: { desde?: string; hasta?: string; estado?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params.desde) q.set("desde", params.desde);
      if (params.hasta) q.set("hasta", params.hasta);
      if (params.estado) q.set("estado", params.estado);
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      return request<PaginaCobros>(`/v1/pagos${q.size ? `?${q}` : ""}`, key);
    },
    obtener: (key: string, id: string) => request<Cobro>(`/v1/pagos/${id}`, key)
  },
  webhooks: {
    obtener: (key: string) => request<WebhookEndpoint>("/v1/webhook-endpoint", key),
    registrar: (key: string, url: string, events?: string[]) =>
      request<WebhookEndpoint>("/v1/webhook-endpoint", key, {
        method: "POST",
        body: JSON.stringify({ url, events })
      }),
    actualizar: (key: string, data: Partial<{ url: string; events: string[]; activa: boolean }>) =>
      request<WebhookEndpoint>("/v1/webhook-endpoint", key, {
        method: "PUT",
        body: JSON.stringify(data)
      })
  }
};
