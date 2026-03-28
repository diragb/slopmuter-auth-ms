// Typescript:
import type { Request, Response } from 'express'

// Exports:
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'route not found',
    },
  })
}
