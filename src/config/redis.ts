// Packages:
import Redis from 'ioredis'

// Constants:
import { env } from './env'
import logger from '../lib/logger'

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

redis.on('error', error => {
  logger.error({ error }, 'Redis connection error')
})
redis.on('connect', () => {
  logger.info('Redis connected')
})

// Exports:
export default redis
