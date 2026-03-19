// Packages:
import { z } from 'zod'
import { ValidationError } from '../lib/errors'

// Typescript:
import type { NextFunction, Request, Response } from 'express'

// Functions:
const validateRequest =
  (schema: z.ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) throw new ValidationError('VALIDATION_ERROR', 'Invalid request body.', z.treeifyError(result.error))

    req.body = result.data
    next()
    return
  }

// Exports:
export default validateRequest
