const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("salon_token");
}

export function setToken(token: string) {
  localStorage.setItem("salon_token", token);
}

export function removeToken() {
  localStorage.removeItem("salon_token");
  localStorage.removeItem("salon_user");
  localStorage.removeItem("salon_data");
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Attach salon identity so the backend knows which salon this frontend belongs to
  const salonId = process.env.NEXT_PUBLIC_SALON_ID;
  if (salonId) headers["X-Salon-ID"] = salonId;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (res.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { params }),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
