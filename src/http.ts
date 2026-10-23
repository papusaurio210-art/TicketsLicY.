export async function requestJson<T>(url: string, init: RequestInit, retries = 2): Promise<T> {
  let lastError: Error = new Error('Request failed');
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return await response.json() as T;
      const body = (await response.text()).slice(0, 400);
      lastError = new Error(`HTTP ${response.status}: ${body}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
  }
  throw lastError;
}

export async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
