export interface RequestBudget {
  timeoutMs?: number;
  totalMs?: number;
}
export async function requestJson<T>(
  url: string,
  init: RequestInit,
  retries = 2,
  budget: RequestBudget = {},
): Promise<T> {
  const deadline = Date.now() + (budget.totalMs ?? 25000);
  let lastError: Error = new Error('Request failed');
  for (let attempt = 0; attempt <= retries; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    let retryAfter = 0;
    try {
      const timeout = AbortSignal.timeout(
        Math.max(1, Math.min(remaining, budget.timeoutMs ?? 10000)),
      );
      const signal = init.signal ? AbortSignal.any([timeout, init.signal]) : timeout;
      const response = await fetch(url, { ...init, signal });
      if (response.ok) return (await response.json()) as T;
      const body = await response.text();
      lastError = new UpstreamHttpError(response.status, body);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
      const header = response.headers.get('Retry-After');
      if (header)
        retryAfter = /^\d+(?:\.\d+)?$/.test(header)
          ? Number(header) * 1000
          : Math.max(0, Date.parse(header) - Date.now());
      try {
        const seconds = JSON.parse(body).parameters?.retry_after;
        if (typeof seconds === 'number' && Number.isFinite(seconds))
          retryAfter = Math.max(retryAfter, seconds * 1000);
      } catch {}
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (init.signal?.aborted) break;
    }
    if (attempt < retries) {
      const wait = Math.max(
        Number.isFinite(retryAfter) ? retryAfter : 0,
        300 * 2 ** attempt + Math.random() * 100,
      );
      // Do not retry earlier than the service permits, or exceed the whole request budget.
      if (wait >= deadline - Date.now()) break;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}

export async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export class UpstreamHttpError extends Error {
  readonly serviceCode?: string;
  readonly reason?: string;
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 400)}`);
    this.name = 'UpstreamHttpError';
    try {
      const data = JSON.parse(body).error;
      this.serviceCode = typeof data === 'string' ? data : data?.status;
      this.reason =
        data?.details?.find((item: { reason?: string }) => item.reason)?.reason ??
        data?.errors?.[0]?.reason;
    } catch {
      /* Error bodies are not always JSON. */
    }
  }
}
