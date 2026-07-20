export class HttpError extends Error {
  readonly status: number;
  readonly retryAfter?: number;

  constructor(status: number, context: string, retryAfter?: number) {
    super(`${context} HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds));
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, Math.round((date - Date.now()) / 1000));
  return undefined;
}

interface HttpResponseLike {
  status: number;
  headers?: { get(name: string): string | null };
}

export function httpErrorFrom(res: HttpResponseLike, context: string): HttpError {
  const retryAfter = parseRetryAfter(res.headers?.get('Retry-After') ?? null);
  return new HttpError(res.status, context, retryAfter);
}
