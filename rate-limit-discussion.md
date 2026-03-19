## Rate Limiting on Express + PostgreSQL + AWS ECS

### The Core Problem with ECS

On ECS you're running **multiple containers** (tasks) behind a load balancer. Each container handles a slice of incoming requests. If you store rate limit counters **in-memory**, each container has its own isolated counter — so a client could hit 100 req/min on container A, then another 100 on container B, completely bypassing your limit.

You need a **shared, centralized store** all containers read/write to.

```
Client → Load Balancer → Container A  ┐
                       → Container B  ├─→ Shared Store (Redis/Postgres)
                       → Container C  ┘
```

---

### The Most Common Solution: Redis

Redis is the industry standard for rate limiting because it's extremely fast and has atomic increment operations built in. The typical setup:

```
npm install express-rate-limit rate-limit-redis ioredis
```

```ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

const redis = new Redis({ host: process.env.REDIS_HOST });

const limiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute window
  max: 100,                  // max 100 requests per window
  standardHeaders: true,     // sends RateLimit-* headers back to client
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => req.ip, // rate limit per IP
});

app.use(limiter);
```

On AWS, you'd spin up an **ElastiCache (Redis)** instance and point `REDIS_HOST` at it. All your ECS containers share the same ElastiCache.

---

### Using PostgreSQL Instead

Since you already have Postgres, you *can* use it — but it's not ideal for high-traffic rate limiting because every request hits the DB. Fine for low-to-moderate traffic though.

```
npm install express-rate-limit rate-limit-postgresql
```

Or implement it manually with a table like:

```sql
CREATE TABLE rate_limits (
  key        TEXT NOT NULL,
  hits       INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key)
);
```

On each request:
1. Upsert a row for `(ip + endpoint)`, increment `hits`
2. If `hits > limit`, reject with 429
3. Expired rows get ignored (or cleaned up by a cron)

The problem is this adds a DB round-trip to **every single request**, which adds latency and load. Redis does the same thing but in microseconds vs milliseconds.

---

### How the Counting Actually Works

The most common algorithm is the **sliding window counter**. Redis makes this clean with `INCR` and `EXPIRE`:

```
1. INCR   user:123:req_count        → returns new count (e.g. 47)
2. EXPIRE user:123:req_count 60     → reset key after 60 seconds
3. If count > 100 → return 429 Too Many Requests
```

Because `INCR` is atomic in Redis, there's no race condition even across many containers hitting it simultaneously.

---

### Different Limits for Different Routes

You'd typically apply different limiters for different sensitivity:

```ts
const globalLimiter = rateLimit({ windowMs: 60_000, max: 200 });
const authLimiter   = rateLimit({ windowMs: 60_000, max: 10 });  // strict
const apiLimiter    = rateLimit({ windowMs: 60_000, max: 100 });

app.use(globalLimiter);                        // applies to everything
app.use("/auth", authLimiter, authRoutes);     // stricter on login/signup
app.use("/api",  apiLimiter,  apiRoutes);
```

---

### What Happens When the Limit is Hit

Express rate limit automatically returns:
```
HTTP 429 Too Many Requests
Retry-After: 42  ← seconds until window resets
```

---

### The Recommended Stack for ECS

```
Express app (ECS)
  └── express-rate-limit
        └── RedisStore
              └── AWS ElastiCache (Redis)   ← shared across all containers
```

Postgres is great for your main data, but for rate limiting, adding a small ElastiCache instance is worth it — it's cheap, fast, and purpose-built for this kind of ephemeral counter data. If you want to keep the stack simple and traffic is modest, Postgres works too — just be aware of the tradeoff.