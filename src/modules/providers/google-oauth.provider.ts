// Packages:
import { OAuth2Client } from 'google-auth-library'
import { AuthenticationError } from '../../lib/errors'
import logger from '../../lib/logger'

// Typescript:
import type { OAuthIdentity, OAuthProvider } from './oauth-provider.interface'

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

// Constants:
import env from '../../config/env'

const oauthClient = new OAuth2Client(env.googleClientId)

// Functions:
const exchangeCodeForGoogleIdentity = async (input: {
  code: string
  redirectUri: string
}): Promise<OAuthIdentity> => {
  const response = await fetch(env.googleTokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })

  const tokenData = (await response.json()) as GoogleTokenResponse

  if (!response.ok) {
    logger.error(
      { status: response.status, error: tokenData.error, errorDescription: tokenData.error_description },
      'Google token exchange failed',
    )

    throw new AuthenticationError(
      'GOOGLE_TOKEN_EXCHANGE_FAILED',
      tokenData.error_description || tokenData.error || 'Failed to exchange Google auth code.',
    )
  }

  if (!tokenData.id_token) {
    throw new AuthenticationError('GOOGLE_MISSING_ID_TOKEN', 'Google token response did not include id_token.')
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokenData.id_token,
    audience: env.googleClientId,
  })
  const payload = ticket.getPayload()

  if (!payload || !payload.sub || !payload.email) {
    throw new AuthenticationError('GOOGLE_INVALID_TOKEN', 'Failed to verify Google ID token.')
  }

  return {
    provider: 'google',
    providerUserId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null,
  }
}

const googleOAuthProvider: OAuthProvider = {
  exchangeCode: exchangeCodeForGoogleIdentity,
}

// Exports:
export { exchangeCodeForGoogleIdentity, googleOAuthProvider }
export type { GoogleTokenResponse }
