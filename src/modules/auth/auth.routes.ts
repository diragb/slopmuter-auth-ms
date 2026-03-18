// Packages:
import { Router } from 'express'
import validateRequest from '../../middleware/request-handler'
import { googleAuthSchema, logoutSchema, refreshTokenSchema } from './auth.schema'
import { googleAuth, logout, refreshAccessToken } from './auth.controller'

// Constants:
const authRouter = Router()

authRouter.post('/google', validateRequest(googleAuthSchema), googleAuth)
authRouter.post('/refresh', validateRequest(refreshTokenSchema), refreshAccessToken)
authRouter.post('/logout', validateRequest(logoutSchema), logout)

// Exports:
export default authRouter
