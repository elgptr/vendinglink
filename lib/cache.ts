interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Set a value in the cache with a TTL (Time To Live).
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiry });
  }

  /**
   * Get a value from the cache. Returns null if missing or expired.
   * @param key Cache key
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete a value from the cache.
   * @param key Cache key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all items from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get a value from the cache, or fetch it and cache it if missing/expired.
   * @param key Cache key
   * @param fetcher Async function to fetch the value if missing
   * @param ttlSeconds Time to live in seconds
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 60): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

// Export a singleton instance
export const cache = new Cache();
