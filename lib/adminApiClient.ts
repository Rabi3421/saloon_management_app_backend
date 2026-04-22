/**
 * Thin wrapper around fetch() for admin routes.
 * Uses admin_token from localStorage.
 */
function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

interface ReqOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

async function adminRequest<T>(
  endpoint: string,
  options: ReqOptions = {}
): Promise<T> {
  const { method = "GET", body, params } = options;

  let url = endpoint;
  if (params) {
    const defined = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined)
    );
    if (Object.keys(defined).length > 0)
      url += "?" + new URLSearchParams(defined).toString();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAdminToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    if (typeof window !== "undefined") window.location.href = "/admin/login";
  }

  if (!res.ok) throw new Error(data.message || "Request failed");

  return data;
}

export const adminApi = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    adminRequest<T>(endpoint, { params }),
  post: <T>(endpoint: string, body: unknown) =>
    adminRequest<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body: unknown) =>
    adminRequest<T>(endpoint, { method: "PUT", body }),
  delete: <T>(endpoint: string) =>
    adminRequest<T>(endpoint, { method: "DELETE" }),
};
