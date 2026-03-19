yes. build only the auth service first, and build it as a clean stateless api with postgres-backed refresh tokens. that keeps it aligned with your prd and makes later migration to ecs painless. your prd already defines the auth service scope, the `refresh_tokens` table, and the three endpoints `/auth/google`, `/auth/refresh`, `/v1/auth/logout`.   

## what i’d build

### stack

* express + typescript
* postgres on aws rds
* jwt access tokens, 15 min
* opaque refresh tokens, 30 days, only hash stored in db
* dockerized from day 1
* deploy same container to ec2 now, ecs later

### do not do this

* don’t store google access/refresh tokens unless you actually need to call google apis later
* don’t put session state in memory
* don’t store raw refresh tokens in db
* don’t make ec2-specific file paths, process management, or nginx assumptions part of app logic

## best auth shape for your case

for your browser extension/web flow, use google identity services’ web auth code flow so the frontend gets an auth code and sends that to your backend, where your backend exchanges it securely. google’s current web guidance explicitly supports sending an authorization code to your backend platform, and google recommends the official gis javascript library for web sign-in. ([Google for Developers][1])

so the flow should be:

1. extension/site opens google oauth popup
2. google returns auth code to frontend
3. frontend `POST /v1/auth/google` with that code
4. auth service exchanges code with google
5. auth service verifies google id token / user identity
6. auth service creates or fetches local user
7. auth service issues:

   * access jwt: 15 min
   * refresh token: random 256-bit string, 30 days
8. refresh token hash stored in `refresh_tokens`
9. access token returned in response body
10. refresh token returned either:

* in response body for extension storage, or
* httpOnly cookie for web app

for a chrome extension, body-returned refresh token is common bc cookie handling is more annoying. but then you MUST treat extension local storage as potentially compromisable and rotate refresh tokens on every use.

## minimal data model

your prd’s `refresh_tokens` table is fine as a baseline. i’d add a few columns though. the prd currently has only `id, user_id, token_hash, expires_at, created_at`. 

i’d actually use:

* `id`
* `user_id`
* `token_hash`
* `expires_at`
* `created_at`
* `revoked_at`
* `replaced_by_token_hash` nullable
* `user_agent` nullable
* `ip_address` nullable
* `provider` default `google`

that gives you token rotation and theft detection without regret later.

## endpoints

### `get /v1/health`

returns:

```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2026-03-17T00:00:00.000Z"
}
```

### `post /v1/auth/google`

input:

```json
{
  "code": "google_auth_code",
  "redirectUri": "https://your-extension-or-site/callback"
}
```

server work:

* validate body
* exchange code with google
* verify id token
* extract `sub`, `email`, `name`, `picture`
* upsert user in shared db
* create access jwt
* create refresh token
* hash refresh token with sha-256
* insert refresh token row
* return tokens + user

response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque_random_token",
  "expiresIn": 900,
  "user": {
    "id": 123,
    "email": "x@example.com",
    "name": "dirag"
  }
}
```

### `post /v1/auth/refresh`

input:

```json
{
  "refreshToken": "opaque_random_token"
}
```

server work:

* hash provided token
* find matching active unexpired row
* if missing: 401
* rotate token:

  * revoke old row
  * create new refresh token + row
* issue new access token
* return new pair

response:

```json
{
  "accessToken": "new_jwt",
  "refreshToken": "new_opaque_random_token",
  "expiresIn": 900
}
```

### `post /v1/auth/logout`

input:

```json
{
  "refreshToken": "opaque_random_token"
}
```

server work:

* hash token
* mark row revoked
* return 204

## jwt contents

access token claims:

* `sub`: local user id
* `email`
* `role` or roles later
* `provider`: `google`
* `type`: `access`

keep it lean. no bloat.

sign with a strong secret or rsa private key. for one service on ec2, hs256 with a strong secret in aws ssm parameter store is acceptable. if you’ll have multiple verifying services later, rs256 + jwks endpoint is cleaner.

## folder structure

```txt
auth-service/
  src/
    app.ts
    server.ts
    config/
      env.ts
    modules/
      auth/
        auth.controller.ts
        auth.routes.ts
        auth.service.ts
        auth.types.ts
      health/
        health.controller.ts
        health.routes.ts
      users/
        user.repository.ts
      tokens/
        token.service.ts
        refresh-token.repository.ts
      providers/
        oauth-provider.interface.ts
        google-oauth.provider.ts
    db/
      pool.ts
    lib/
      jwt.ts
      crypto.ts
      http-error.ts
      logger.ts
    middleware/
      error-handler.ts
      request-id.ts
    validations/
      auth.schemas.ts
  migrations/
  Dockerfile
  docker-compose.yml
  package.json
  tsconfig.json
```

this is the extensibility seam you asked for: `oauth-provider.interface.ts`. google is just one implementation.

## the provider abstraction

make an interface like:

```ts
interface OAuthProvider {
  exchangeCode(input: { code: string; redirectUri: string }): Promise<OAuthIdentity>;
}
```

and `OAuthIdentity` returns:

```ts
{
  provider: "google";
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}
```

then later `github-oauth.provider.ts` and `apple-oauth.provider.ts` slot in without mutilating the service.

## database notes

for now you said “using aws rds as the database”. good. use postgres on rds, not mysql, bc your broader prd is already postgres-centric. 

create:

* `users`
* `refresh_tokens`

even if you’re “only focusing on auth service”, you still need a user row to attach refresh tokens to, unless another service already owns users and is available rn. your prd places `users` in the users service and `refresh_tokens` in auth, with shared-db cross-service fk. for early-stage reality, that’s fine in one shared postgres db.  

## env vars

```env
NODE_ENV=production
PORT=8080

DATABASE_URL=postgresql://...

JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m

REFRESH_TOKEN_TTL_DAYS=30

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_TOKEN_ENDPOINT=https://oauth2.googleapis.com/token

APP_BASE_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=chrome-extension://<id>,https://yourapp.com
```

## local dev

use docker compose:

* app container
* postgres container

not rds locally. that’s masochism.

## deployment path that won’t age badly

### now: ec2

* launch ubuntu ec2
* install docker + docker compose plugin
* put app behind nginx or caddy
* use tls
* run container with env vars from ssm/parameter store or `.env` pulled securely
* app connects to rds over private networking if possible

### later: ecs

because the app is already containerized and stateless:

* push image to ecr
* create ecs task definition
* run behind alb
* inject same env vars/secrets
* done-ish

your prd currently prefers ecs/fargate, rds, and a load-balanced aws setup. building the auth service as a containerized stateless app keeps you aligned with that even if you temporarily deploy on ec2.  

## security bits you should not skip

* verify google id token audience/client id
* enforce exact redirect uri matching
* rotate refresh tokens on every refresh
* revoke old refresh token on rotation
* hash refresh tokens in db
* add rate limiting on auth endpoints
* add cors allowlist
* use helmet
* validate request bodies with zod or valibot
* log request correlation id
* never trust `email_verified` unless it comes from verified google token payload
* prefer one refresh token per device/session, not one global token

## ec2 + rds networking

this is the sane shape:

* ec2 in public subnet only if you’re keeping it simple
* rds in private subnet
* rds security group allows inbound only from ec2 security group on 5432
* app port 8080 exposed only to nginx locally, or only to alb if you add alb
* ssh locked down to your ip or, better, use ssm session manager

## concrete implementation order

1. scaffold express + ts
2. add `GET /v1/health`
3. add postgres connection
4. create migrations for `users` and `refresh_tokens`
5. implement `google-oauth.provider.ts`
6. implement `POST /v1/auth/google`
7. implement jwt signing
8. implement refresh token hashing + persistence
9. implement `POST /v1/auth/refresh` with rotation
10. implement `POST /v1/auth/logout`
11. dockerize
12. run locally with docker compose
13. provision rds
14. provision ec2
15. deploy container to ec2
16. later move image to ecr/ecs

## one correction to your mental model

don’t think “deploying to ec2” as “my app runs on ec2 and that’s the architecture.” think “ec2 is just the first place my container runs.” the service architecture should still be:

* stateless app
* external db
* external secrets
* external logs

that’s the whole game.

## my recommendation

use:

* express
* typescript
* pg
* drizzle or knex for migrations
* zod
* jose or jsonwebtoken
* google auth via direct token exchange + id token verification
* pino for logs

skip orm maximalism unless you LIKE suffering.

if you want, next i’ll lay out the exact starter codebase for this auth service:

* package.json
* folder tree
* db schema sql
* endpoint contracts
* local docker setup
* ec2 deployment steps

[1]: https://developers.google.com/identity/oauth2/web/guides/overview "Authorizing for Web  |  Web guides  |  Google for Developers"
