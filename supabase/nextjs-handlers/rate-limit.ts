// Simple, high-performance in-memory Rate Limiter for serverless environments (e.g. Vercel/Next.js)
// In production, you can replace the map with a Redis instance (Upstash) if deploying multiple instances.

const ipCache = new Map<string, { count: number; expiresAt: number }>();

interface RateLimitConfig {
  limit: number;      // Maximum requests allowed in the interval
  interval: number;   // Interval in milliseconds (e.g. 60000 for 1 minute)
}

export function isRateLimited(ip: string, config: RateLimitConfig): {
  limited: boolean;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const cached = ipCache.get(ip);

  // Clean stale keys periodically (simple garbage collection)
  if (ipCache.size > 5000) {
    for (const [key, val] of ipCache.entries()) {
      if (val.expiresAt < now) {
        ipCache.delete(key);
      }
    }
  }

  if (!cached || cached.expiresAt < now) {
    // New window
    const expiresAt = now + config.interval;
    ipCache.set(ip, { count: 1, expiresAt });
    return {
      limited: false,
      remaining: config.limit - 1,
      reset: expiresAt,
    };
  }

  // Existing window
  cached.count += 1;
  const limited = cached.count > config.limit;
  
  return {
    limited,
    remaining: Math.max(0, config.limit - cached.count),
    reset: cached.expiresAt,
  };
}
