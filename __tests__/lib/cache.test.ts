import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { cache } from "@/lib/cache";

describe("cache utility", () => {
  beforeEach(() => {
    cache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets and gets a value", () => {
    cache.set("test-key", "test-value");
    expect(cache.get("test-key")).toBe("test-value");
  });

  it("returns null for missing keys", () => {
    expect(cache.get("missing")).toBeNull();
  });

  it("expires values after TTL", () => {
    cache.set("expire-key", "data", 10); // 10 seconds
    expect(cache.get("expire-key")).toBe("data");

    // Advance time by 11 seconds
    vi.advanceTimersByTime(11000);

    expect(cache.get("expire-key")).toBeNull();
  });

  it("deletes a value", () => {
    cache.set("del-key", "data");
    cache.delete("del-key");
    expect(cache.get("del-key")).toBeNull();
  });

  it("getOrSet returns cached value if present", async () => {
    cache.set("getorset-key", "cached-data");
    const fetcher = vi.fn().mockResolvedValue("new-data");

    const result = await cache.getOrSet("getorset-key", fetcher);
    expect(result).toBe("cached-data");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("getOrSet fetches and caches if missing", async () => {
    const fetcher = vi.fn().mockResolvedValue("new-data");

    const result = await cache.getOrSet("getorset-new", fetcher, 30);
    expect(result).toBe("new-data");
    expect(fetcher).toHaveBeenCalledOnce();
    
    // Check if it's actually cached now
    expect(cache.get("getorset-new")).toBe("new-data");
  });
});
