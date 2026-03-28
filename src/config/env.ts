// Packages:
import { config } from 'dotenv'
import ms from 'ms'
import { z } from 'zod'

// Typescript:
import type { SignOptions } from 'jsonwebtoken'

// Functions:
config()

// Constants:
const envSchema = z.object({
  SERVICE_NAME: z.string().min(1).default('auth-service'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default('15m')
    .refine(val => typeof ms(val as ms.StringValue) === 'number', {
      message: 'JWT_ACCESS_EXPIRES_IN is invalid',
    }),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_TOKEN_ENDPOINT: z.string().default('https://oauth2.googleapis.com/token'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  APP_BASE_URL: z.string().default(''),
  ALLOWED_ORIGINS: z
    .string()
    .default('chrome-extension://mcihoalbpibkcngfpohfolldkicapgcj,https://slopmuter.com,http://localhost:3000'),
  ALLOWED_CALLBACK_URLS: z
    .string()
    .default('https://slopmuter.com/auth/google/callback,http://localhost:3000/auth/google/callback'),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsedEnv.error))
  process.exit(1)
}

const rawEnv = parsedEnv.data

// Exports:
export const env = {
  serviceName: rawEnv.SERVICE_NAME,
  nodeEnv: rawEnv.NODE_ENV,
  port: rawEnv.PORT,
  databaseUrl: rawEnv.DATABASE_URL,
  jwtAccessSecret: rawEnv.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: rawEnv.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  refreshTokenTtlDays: rawEnv.REFRESH_TOKEN_TTL_DAYS,
  googleClientId: rawEnv.GOOGLE_CLIENT_ID,
  googleClientSecret: rawEnv.GOOGLE_CLIENT_SECRET,
  googleTokenEndpoint: rawEnv.GOOGLE_TOKEN_ENDPOINT,
  redisUrl: rawEnv.REDIS_URL,
  appBaseUrl: rawEnv.APP_BASE_URL,
  allowedOrigins: rawEnv.ALLOWED_ORIGINS.split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  allowedCallbackUrls: rawEnv.ALLOWED_CALLBACK_URLS.split(',')
    .map(url => url.trim())
    .filter(Boolean),
}
