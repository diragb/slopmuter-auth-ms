// Typescript:
import type { NextFunction, Request, Response } from 'express'

// Functions:
const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(error)

  if (error instanceof Error) {
    return res.status(500).json({
      error: 'internal_server_error',
      message: error.message,
    })
  }

  return res.status(500).json({
    error: 'internal_server_error',
    message: 'Something went wrong.',
  })
}

// Exports:
export { errorHandler }