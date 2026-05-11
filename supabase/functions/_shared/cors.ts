import { getAllowedOrigins } from './env.ts';

const DEFAULT_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const DEFAULT_HEADERS = 'authorization, x-client-info, apikey, content-type';
const DEFAULT_MAX_AGE = '86400';

function resolveOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    return '*';
  }

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  return 'null';
}

export function buildCorsHeaders(request: Request, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders || undefined);
  headers.set('Access-Control-Allow-Origin', resolveOrigin(request));
  headers.set('Access-Control-Allow-Methods', DEFAULT_METHODS);
  headers.set('Access-Control-Allow-Headers', DEFAULT_HEADERS);
  headers.set('Access-Control-Max-Age', DEFAULT_MAX_AGE);
  headers.set('Vary', 'Origin');

  return headers;
}

export function withCors(request: Request, response: Response) {
  const headers = buildCorsHeaders(request, response.headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleOptions(request: Request) {
  return new Response('ok', {
    status: 200,
    headers: buildCorsHeaders(request),
  });
}
