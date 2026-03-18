// Typescript:
import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

// Functions:
const validateRequest =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request body.',
        details: z.treeifyError(result.error),
      })
    }

    req.body = result.data
    next()
    return
  }

// Exports:
export default validateRequest
