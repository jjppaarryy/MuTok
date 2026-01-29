/**
 * Fetch with timeout support
 * Prevents hanging requests that can exhaust resources
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch JSON with timeout and automatic parsing
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<T> {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Retry wrapper for fetch operations
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes("timed out") && attempt >= 1) {
        throw lastError; // Only 2 attempts for timeouts
      }
      
      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

/**
 * Default timeout values for different operation types
 */
export const TIMEOUTS = {
  /** Quick operations like status checks */
  SHORT: 10000,
  /** Standard API calls */
  MEDIUM: 30000,
  /** LLM/AI operations that may take longer */
  LONG: 60000,
  /** Very long operations like video rendering */
  VERY_LONG: 300000
} as const;
