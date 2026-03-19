// Packages:
import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'

// Typescript:
import type { SendCommandFn } from 'rate-limit-redis'

// Constants:
import redis from '../config/redis'

const sendCommand: SendCommandFn = (command: string, ...args: string[]) =>
  redis.call(command, ...args) as ReturnType<SendCommandFn>

const createRedisStore = () => new RedisStore({ sendCommand })

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
})

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  message: { error: 'Too many authentication attempts, please try again later' },
})
