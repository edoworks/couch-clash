// Shared bounded transport. Contains no credentials or endpoint configuration.
export const MAX_BYTES = 262144;
export class ScoreError extends Error {
  constructor(code, cooldown = 60) { super(code); this.code = code; this.cooldown = cooldown; }
}
// Deadline covers fetch AND the entire body. Redirects never forward credentials.
export async function boundedJSON(fetcher, url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController(); let reader, timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reader?.cancel().catch(() => {}); reject(new ScoreError('timeout')); }, timeoutMs); });
  const work = (async () => {
    const response = await fetcher(url, { ...options, redirect: 'error', signal: controller.signal });
    if (!response.ok) {
      const rawRetry = response.headers.get('retry-after')?.trim() ?? '';
      const retry = /^\d+$/.test(rawRetry) ? Number(rawRetry) : (Date.parse(rawRetry) - Date.now()) / 1000;
      const cooldown = Number.isFinite(retry) ? Math.max(60, Math.min(3600, Math.ceil(retry))) : 60;
      response.body?.cancel().catch(() => {});
      throw new ScoreError(response.status === 401 || response.status === 403 ? 'unauthorized' : response.status === 429 ? 'rate_limited' : 'upstream', cooldown);
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) { response.body?.cancel().catch(() => {}); throw new ScoreError('oversized'); }
    if (!response.body) throw new ScoreError('invalid_response');
    reader = response.body.getReader(); const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { reader.cancel().catch(() => {}); throw new ScoreError('oversized'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let pos = 0;
    for (const c of chunks) { bytes.set(c, pos); pos += c.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new ScoreError('invalid_response'); }
  })();
  try { return await Promise.race([work, deadline]); }
  catch (e) { throw e instanceof ScoreError ? e : new ScoreError('unavailable'); }
  finally { clearTimeout(timer); controller.abort(); }
}
