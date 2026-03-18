// Packages:
import { Router } from 'express'
import { getHealth } from './health.controller'

// Constants:
const healthRouter = Router()

// Routes:
healthRouter.get('/', getHealth)

// Exports:
export default healthRouter
