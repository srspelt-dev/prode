// Helper de fetch para el frontend. Todas las requests incluyen la cookie de sesión.

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data as T;
}

export const apiGet = <T = any>(path: string) => api<T>(path);

export const apiPost = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const apiPut = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
