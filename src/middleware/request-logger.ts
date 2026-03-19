// Packages:
import crypto from 'node:crypto'
import logger from '../lib/logger'

// Typescript:
import type { NextFunction, Request, Response } from 'express'

// Functions:
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID()
  const start = Date.now()

  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl,
  })

  req.log.info('request started')

  res.on('finish', () => {
    req.log.info(
      {
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      'request completed',
    )
  })

  next()
}

// Exports:
export { requestLogger }
