// Session-based caching for GitHub API responses to reduce rate limiting

const CACHE_PREFIX = "odin_gh_";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable
  }
}

export function clearCache(): void {
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}
