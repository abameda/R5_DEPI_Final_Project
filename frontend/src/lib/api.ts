import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { filterBody, filterParams, type Filters } from "./filters";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | string[] | undefined | null>;

export function buildQuery(f: Partial<Filters> | null, params: Params = {}): string {
  const sp = new URLSearchParams(f ? filterParams(f) : []);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body.detail === "string") detail = body.detail;
    else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join("; ");
  } catch {
    /* keep the generic message */
  }
  throw new ApiError(res.status, detail);
}

export async function apiGet<T>(path: string, f: Partial<Filters> | null = null, params: Params = {}): Promise<T> {
  return handle<T>(await fetch(`/api${path}${buildQuery(f, params)}`));
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(await fetch(`/api${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}

/** GET an analytical endpoint for the current filters; keeps the previous result while refetching. */
export function useApi<T>(path: string, f: Partial<Filters> | null, params: Params = {}, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: [path, f ? filterParams(f) : null, params],
    queryFn: () => apiGet<T>(path, f, params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 5 * 60_000,
    retry: (n, err) => n < 1 && !(err instanceof ApiError && err.status < 500),
  });
}

export function usePost<T>(path: string, body: unknown, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: [path, body],
    queryFn: () => apiPost<T>(path, body),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 5 * 60_000,
    retry: (n, err) => n < 1 && !(err instanceof ApiError && err.status < 500),
  });
}

export { filterBody };
