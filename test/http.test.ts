import { afterEach, describe, it, expect, vi } from 'vitest';
import { requestJson } from '../src/http';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('presupuesto y reintentos de servicios externos', () => {
  it('respeta Retry-After antes de volver a llamar al servicio', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    const pending = requestJson('https://example.test', {}, 1, { totalMs: 5000 });
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: true });
  });
  it('respeta también retry_after de Telegram y no reintenta errores permanentes', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ parameters: { retry_after: 2 } }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    const pending = requestJson('https://example.test', {}, 1, { totalMs: 5000 });
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    fetch.mockReset().mockResolvedValue(new Response('{}', { status: 400 }));
    await expect(requestJson('https://example.test', {})).rejects.toThrow('HTTP 400');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('evita reintentos cuando el servicio exige esperar más que el presupuesto disponible', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '60' } }));
    vi.stubGlobal('fetch', fetch);
    await expect(requestJson('https://example.test', {}, 2, { totalMs: 100 })).rejects.toThrow(
      'HTTP 429',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('cancela una conexión atascada al llegar a su tiempo máximo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
          }),
      ),
    );
    await expect(
      requestJson('https://example.test', {}, 0, { timeoutMs: 10, totalMs: 100 }),
    ).rejects.toThrow();
  });
});
