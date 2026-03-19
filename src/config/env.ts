// Packages:
import dotenv from 'dotenv'
import ms from 'ms'

// Typescript:
import type { SignOptions } from 'jsonwebtoken'

// Functions:
dotenv.config()

// Constants:
const env = {
  serviceName: process.env['SERVICE_NAME'] || 'auth-service',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: Number(process.env['PORT']) || 8080,

  databaseUrl: process.env['DATABASE_URL'] || '',

  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] || '',
  jwtAccessExpiresIn: (process.env['JWT_ACCESS_EXPIRES_IN'] || '15m') as SignOptions['expiresIn'],
  refreshTokenTtlDays: Number(process.env['REFRESH_TOKEN_TTL_DAYS']) || 30,

  googleClientId: process.env['GOOGLE_CLIENT_ID'] || '',
  googleClientSecret: process.env['GOOGLE_CLIENT_SECRET'] || '',
  googleTokenEndpoint: process.env['GOOGLE_TOKEN_ENDPOINT'] || 'https://oauth2.googleapis.com/token',

  redisUrl: process.env['REDIS_URL'] || 'redis://localhost:6379',

  appBaseUrl: process.env['APP_BASE_URL'] || '',
  allowedOrigins: (
    process.env['ALLOWED_ORIGINS'] ||
    'chrome-extension://mcihoalbpibkcngfpohfolldkicapgcj,https://slopmuter.com,http://localhost:3000'
  )
    .split(',')
    .map(str => str.trim()),
  allowedCallbackUrls: (
    process.env['ALLOWED_CALLBACK_URLS'] ||
    'https://slopmuter.com/auth/google/callback,http://localhost:3000/auth/google/callback'
  ).split(','),
} as const

if (!env.databaseUrl) throw new Error('DATABASE_URL is not set')
if (!env.jwtAccessSecret) throw new Error('JWT_ACCESS_SECRET is not set')
if (typeof ms(env.jwtAccessExpiresIn as ms.StringValue) !== 'number')
  throw new Error('JWT_ACCESS_EXPIRES_IN is invalid')
if (!env.googleClientId) throw new Error('GOOGLE_CLIENT_ID is not set')
if (!env.googleClientSecret) throw new Error('GOOGLE_CLIENT_SECRET is not set')

// Exports:
export default env
