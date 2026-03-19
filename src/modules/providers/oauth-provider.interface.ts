// Typescript:
type OAuthProviderName = 'google'

interface OAuthIdentity {
  provider: OAuthProviderName
  providerUserId: string
  email: string
  emailVerified: boolean
  name: string | null
  avatarUrl: string | null
}

interface OAuthProvider {
  exchangeCode: (input: { code: string; redirectUri: string }) => Promise<OAuthIdentity>
}

// Exports:
export type { OAuthProviderName, OAuthIdentity, OAuthProvider }
