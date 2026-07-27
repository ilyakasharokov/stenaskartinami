const cache = new Map();

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value, ttlSeconds) {
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cachedFetch(key, ttlSeconds, fetcher) {
  const cached = getCached(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  setCached(key, value, ttlSeconds);
  return value;
}
