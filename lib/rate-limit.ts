/**
 * Rate Limiting Utility
 *
 * Custom rate limiting implementation using ioredis (compatible with Vercel KV).
 * Uses sliding window algorithm to prevent burst-then-wait patterns.
 */

import Redis from "ioredis";

// Lazy Redis client initialization
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.KV_REDIS_URL!, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }
  return redisClient;
}

/**
 * Sliding window rate limiter using Redis sorted sets
 */
async function checkLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  prefix: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const redis = getRedisClient();
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Remove old entries outside the window
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count current requests in window
  const count = await redis.zcard(key);

  // Check if limit exceeded
  if (count >= limit) {
    // Get oldest entry to calculate reset time
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const resetTime = oldest.length > 0
      ? parseInt(oldest[1]) + windowMs
      : now + windowMs;

    return {
      success: false,
      limit,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);

  // Set expiry on key
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return {
    success: true,
    limit,
    remaining: limit - (count + 1),
    reset: now + windowMs,
  };
}

/**
 * Rate limit configurations
 */
const RATE_LIMITS = {
  // Tier 1: Expensive AI Endpoints (Gemini API - costs money)
  expensive: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: "ratelimit:expensive",
  },
  expensiveBurst: {
    limit: 2,
    windowMs: 60 * 1000, // 1 minute
    prefix: "ratelimit:expensive-burst",
  },

  // Tier 2: Quota-Limited Endpoints (Google Custom Search - 100 free/day)
  quotaLimited: {
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: "ratelimit:quota-limited",
  },
  quotaLimitedBurst: {
    limit: 3,
    windowMs: 60 * 1000, // 1 minute
    prefix: "ratelimit:quota-limited-burst",
  },

  // Tier 3: Resource-Intensive Endpoints (File uploads + processing)
  resourceIntensive: {
    limit: 15,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: "ratelimit:resource-intensive",
  },
  resourceIntensiveBurst: {
    limit: 3,
    windowMs: 60 * 1000, // 1 minute
    prefix: "ratelimit:resource-intensive-burst",
  },

  // Tier 4: Lightweight Endpoints (Redis reads/writes)
  lightweight: {
    limit: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    prefix: "ratelimit:lightweight",
  },
};

/**
 * Rate limit configuration presets
 */
export const rateLimitPresets = {
  /** For /api/summary (Query Corpus - Gemini File Search) */
  summary: {
    hourly: RATE_LIMITS.expensive,
    burst: RATE_LIMITS.expensiveBurst,
    description: "AI queries (10/hour, 2/min)",
  },

  /** For /api/search (Research Agent - Google Custom Search) */
  search: {
    hourly: RATE_LIMITS.quotaLimited,
    burst: RATE_LIMITS.quotaLimitedBurst,
    description: "Web searches (20/hour, 3/min)",
  },

  /** For /api/process-blob (File upload processing) */
  upload: {
    hourly: RATE_LIMITS.resourceIntensive,
    burst: RATE_LIMITS.resourceIntensiveBurst,
    description: "File uploads (15/hour, 3/min)",
  },

  /** For /api/corpus/delete and other mutations */
  mutation: {
    hourly: RATE_LIMITS.resourceIntensive,
    burst: RATE_LIMITS.resourceIntensiveBurst,
    description: "Data mutations (15/hour, 3/min)",
  },

  /** For /api/corpus/list and other read-only endpoints */
  readonly: {
    hourly: RATE_LIMITS.lightweight,
    burst: null, // No burst limit for lightweight ops
    description: "Read operations (50/hour)",
  },
};

/**
 * Get client identifier from request
 * Uses IP address for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (Vercel sets x-forwarded-for)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  // Use first IP from x-forwarded-for (client IP)
  const ip = forwardedFor?.split(",")[0].trim() || realIp || "anonymous";

  return ip;
}

/**
 * Format time remaining until rate limit resets
 */
export function formatRetryAfter(resetTimestamp: number): string {
  const now = Date.now();
  const msRemaining = resetTimestamp - now;

  if (msRemaining <= 0) return "now";

  const minutes = Math.ceil(msRemaining / 1000 / 60);

  if (minutes < 1) return "less than a minute";
  if (minutes === 1) return "1 minute";
  if (minutes < 60) return `${minutes} minutes`;

  const hours = Math.ceil(minutes / 60);
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}

/**
 * Check rate limit with both hourly and burst limits
 * Returns { allowed: boolean, response?: Response }
 */
export async function checkRateLimit(
  identifier: string,
  preset: typeof rateLimitPresets.summary
): Promise<{ allowed: boolean; response?: Response; remaining?: number }> {
  // Check hourly limit first
  const hourlyResult = await checkLimit(
    identifier,
    preset.hourly.limit,
    preset.hourly.windowMs,
    preset.hourly.prefix
  );

  if (!hourlyResult.success) {
    const retryAfter = formatRetryAfter(hourlyResult.reset);

    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: `Rate limit exceeded for ${preset.description}`,
          retryAfter,
          resetAt: new Date(hourlyResult.reset).toISOString(),
          limit: hourlyResult.limit,
          remaining: 0,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((hourlyResult.reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(hourlyResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(hourlyResult.reset),
          },
        }
      ),
    };
  }

  // Check burst limit if configured
  if (preset.burst) {
    const burstResult = await checkLimit(
      identifier,
      preset.burst.limit,
      preset.burst.windowMs,
      preset.burst.prefix
    );

    if (!burstResult.success) {
      const retryAfter = formatRetryAfter(burstResult.reset);

      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: `Too many requests in quick succession for ${preset.description}`,
            retryAfter,
            resetAt: new Date(burstResult.reset).toISOString(),
            limit: burstResult.limit,
            remaining: 0,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((burstResult.reset - Date.now()) / 1000)),
              "X-RateLimit-Limit": String(burstResult.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(burstResult.reset),
            },
          }
        ),
      };
    }
  }

  // All checks passed
  return {
    allowed: true,
    remaining: hourlyResult.remaining,
  };
}
