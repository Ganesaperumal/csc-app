/**
 * In-Memory Client-Side Egress Cache
 * Caches large list queries (All Jobs, Active Jobs, Closed Jobs, etc.) for a configurable TTL
 * to prevent duplicate network data egress when users navigate between tabs in /home/*.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Default TTL: 60 seconds (1 minute)
const DEFAULT_TTL_MS = 60 * 1000;

export const jobsCache = {
  get<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttlMs;
    if (isExpired) {
      memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  },

  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  patchItem<T extends { job_number?: string }>(key: string, updatedItem: Partial<T> & { job_number: string }): void {
    const entry = memoryCache.get(key);
    if (!entry || !Array.isArray(entry.data)) return;

    const list = entry.data as T[];
    const idx = list.findIndex((item) => item.job_number === updatedItem.job_number);

    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedItem };
    }
  },

  removeItem<T extends { job_number?: string }>(key: string, jobNumber: string): void {
    const entry = memoryCache.get(key);
    if (!entry || !Array.isArray(entry.data)) return;

    entry.data = (entry.data as T[]).filter((item) => item.job_number !== jobNumber);
  },

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      memoryCache.clear();
      return;
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(keyPrefix)) {
        memoryCache.delete(key);
      }
    }
  },
};
