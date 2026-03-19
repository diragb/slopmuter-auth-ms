// Packages:
import pino from 'pino'

// Constants:
import env from '../config/env'

const logger = pino({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  ...(env.nodeEnv === 'production'
    ? {
        formatters: {
          level: label => ({ level: label }),
        },
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
  base: {
    service: env.serviceName,
    env: env.nodeEnv,
  },
})

// Exports:
export default logger
