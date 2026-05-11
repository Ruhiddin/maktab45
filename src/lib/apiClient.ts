import { buildApiUrl, type ApiRouteKey } from './apiBase';
import { normalizeErrorMessage } from './clientErrors';

type Primitive = string | number | boolean;

type ApiRequestOptions = {
  method?: string;
  token?: string | null;
  headers?: HeadersInit;
  json?: unknown;
  body?: BodyInit | null;
  pathParams?: Record<string, Primitive | null | undefined>;
  searchParams?: Record<string, Primitive | null | undefined>;
  signal?: AbortSignal;
};

function mergeHeaders(headers?: HeadersInit) {
  return new Headers(headers || undefined);
}

function resolveBody(options: ApiRequestOptions, headers: Headers) {
  if (options.json !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return JSON.stringify(options.json);
  }

  return options.body;
}

export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return normalizeErrorMessage(data.error.trim());
    }
  } else {
    const text = await response.text().catch(() => '');
    if (text.trim()) {
      return normalizeErrorMessage(text.trim());
    }
  }

  return normalizeErrorMessage(fallback);
}

export async function apiRequest(route: ApiRouteKey, options: ApiRequestOptions = {}) {
  const headers = mergeHeaders(options.headers);

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const body = resolveBody(options, headers);

  return fetch(
    buildApiUrl(route, {
      pathParams: options.pathParams,
      searchParams: options.searchParams,
    }),
    {
      method: options.method,
      headers,
      body,
      signal: options.signal,
    }
  );
}

export async function apiJson<T>(
  route: ApiRouteKey,
  options: ApiRequestOptions & { fallbackError: string }
) {
  const response = await apiRequest(route, options);

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, options.fallbackError));
  }

  return response.json() as Promise<T>;
}

export async function apiRequestOrThrow(
  route: ApiRouteKey,
  options: ApiRequestOptions & { fallbackError: string }
) {
  const response = await apiRequest(route, options);

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, options.fallbackError));
  }

  return response;
}
