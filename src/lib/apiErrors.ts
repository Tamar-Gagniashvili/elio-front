/** The first validation message from a failed API call (Laravel errors come back as the body text) */
export function readApiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const body = JSON.parse(raw);
    const first = body.errors && Object.values(body.errors as Record<string, string[]>)[0]?.[0];
    return first || body.message || raw;
  } catch {
    return raw;
  }
}
