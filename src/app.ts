// Packages:
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/error-handler'

// Typescript:
import type { Application } from 'express'

// Routers:
import healthRouter from './modules/heatlh/health.routes'
import authRouter from './modules/auth/auth.routes'

// Constants:
const app: Application = express()

// Middlewares:
app.use(helmet())
app.use(cors({
  origin: process.env['CORS_ORIGIN']?.split(',').map(s => s.trim()),
  credentials: true,
}))
app.use(express.json())

app.use('/v1/health', healthRouter)
app.use('/v1/auth', authRouter)

app.use(errorHandler)

// Exports:
export default app
