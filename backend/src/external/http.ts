/**
 * 外部 API 用の共通クライアント。
 *
 * Wikimedia は説明的な User-Agent を要求し（無指定だと 403 を返す）、
 * 短時間に大量のリクエストを投げるとレート制限にかかる。
 * ここで UA 付与・並列数制限・リトライをまとめて面倒を見る。
 */

const USER_AGENT =
  process.env.EXTERNAL_USER_AGENT ??
  'DinosaurArchiveExhibit/1.0 (school exhibition project; contact via repository issues)';

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
          'Accept-Language': 'ja,en;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const error = new HttpError(`External request failed: ${response.status} ${response.statusText}`, response.status);
        if (!isRetryable(response.status) || attempt === MAX_ATTEMPTS) {
          throw error;
        }
        lastError = error;
      } else {
        return (await response.json()) as T;
      }
    } catch (error) {
      lastError = error;
      if (error instanceof HttpError && !isRetryable(error.status)) {
        throw error;
      }
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
    }

    // 429 を踏んだ相手を追い打ちしないよう、指数的に間隔を空ける。
    await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
  }

  throw lastError instanceof Error ? lastError : new Error(`External request failed: ${url}`);
}

/** 同時実行数を絞りながら順に処理する。外部APIを一斉に叩いて弾かれるのを防ぐ。 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  });

  await Promise.all(runners);
  return results;
}
