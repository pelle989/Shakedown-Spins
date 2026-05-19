const DEFAULT_FETCH_TIMEOUT_MS = 5000;

export class FetchTimeoutError extends Error {
  constructor(message = `External request timed out after ${DEFAULT_FETCH_TIMEOUT_MS}ms.`) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromParent = () => controller.abort();

  init.signal?.addEventListener('abort', abortFromParent, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError' && !init.signal?.aborted) {
      throw new FetchTimeoutError(`External request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromParent);
  }
}
