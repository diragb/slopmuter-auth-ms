// Packages:
import logger from '../lib/logger'

// Typescript:
import type { NextFunction, Request, Response } from 'express'

// Constants:
import { AppError } from '../lib/errors'

// Functions:
const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const log = req.log ?? logger

  if (error instanceof AppError) {
    log.warn(
      { err: error, code: error.code, statusCode: error.statusCode },
      error.message,
    )

    const errorBody: { code: string; message: string; details?: unknown } = {
      code: error.code,
      message: error.message,
    }

    if ('details' in error && error.details !== undefined) {
      errorBody.details = error.details
    }

    return res.status(error.statusCode).json({ error: errorBody })
  }

  log.error({ err: error }, 'unhandled error')

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong.',
    },
  })
}

// Exports:
export { errorHandler }
