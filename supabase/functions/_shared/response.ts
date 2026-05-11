export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function jsonError(status: number, error: string, init?: ResponseInit) {
  return json({ error }, {
    ...init,
    status,
  });
}
