import rateLimit from "express-rate-limit";

let sharedRedisClient = null;
let redisModulesPromise = null;

/**
 * Lazily loads ioredis + rate-limit-redis only if REDIS_URL is configured,
 * so single-instance/local deployments never need those packages
 * installed at all. Without a shared store, express-rate-limit's default
 * in-memory MemoryStore only tracks requests seen by *this* process -
 * which is fine for a single long-running server, but silently gives
 * every instance/cold-start its own independent quota when running
 * horizontally-scaled (multiple Render instances) or serverless
 * (Vercel functions, where each cold start starts counting from zero).
 * Setting REDIS_URL fixes that by sharing counters across instances.
 */
async function getRedisStoreFactory() {
  if (!process.env.REDIS_URL) return null;

  if (!redisModulesPromise) {
    redisModulesPromise = Promise.all([import("ioredis"), import("rate-limit-redis")]);
  }

  const [{ default: Redis }, { RedisStore }] = await redisModulesPromise;

  if (!sharedRedisClient) {
    sharedRedisClient = new Redis(process.env.REDIS_URL);
    sharedRedisClient.on("error", (err) => {
      console.error("[SmartQueue] Redis rate-limit store error:", err.message);
    });
  }

  return (prefix) =>
    new RedisStore({
      prefix,
      sendCommand: (...args) => sharedRedisClient.call(...args)
    });
}

/**
 * Builds a fresh set of rate limiters. Each call produces independent
 * limiter state (unless a shared Redis store is configured, in which case
 * state is shared through Redis as intended). createApp() calls this once
 * per app instance rather than importing module-level singletons, so:
 *   - in production, one process = one createApp() call = one set of
 *     limiters, same as before;
 *   - in tests, each createApp() call gets isolated counters instead of
 *     silently sharing quota with every other app instance created in the
 *     same test run.
 */
export async function createRateLimiters() {
  const storeFactory = await getRedisStoreFactory();

  const generalLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
    store: storeFactory ? storeFactory("rl:general:") : undefined,
    message: { error: "Too many requests. Please slow down and try again shortly." }
  });

  // Tighter limiter specifically for POST /api/queue/join, since that's the
  // one unauthenticated endpoint that writes to the database and could
  // otherwise be used to flood the queue or exhaust storage.
  const joinLimiter = rateLimit({
    windowMs: Number(process.env.JOIN_RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.JOIN_RATE_LIMIT_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
    store: storeFactory ? storeFactory("rl:join:") : undefined,
    message: { error: "Too many queue-join attempts. Please wait a moment before trying again." }
  });

  // Stricter limiter for admin auth attempts, to slow down key brute-forcing
  // on top of the timing-safe comparison in adminAuth.js.
  const adminLimiter = rateLimit({
    windowMs: Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.ADMIN_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    store: storeFactory ? storeFactory("rl:admin:") : undefined,
    message: { error: "Too many admin requests. Please wait a moment before trying again." }
  });

  return { generalLimiter, joinLimiter, adminLimiter };
}
