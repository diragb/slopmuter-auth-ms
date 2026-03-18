// Typescript:
import type { Request, Response } from 'express'

// Constants:
import env from '../../config/env'

// Functions:
const getHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: env.serviceName,
    timestamp: new Date().toISOString(),
  })
}

// Exports:
export {
  getHealth,
}
