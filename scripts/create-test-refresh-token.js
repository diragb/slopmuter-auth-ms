const crypto = require("crypto")
const { Client } = require("pg")
require("dotenv").config()

function generateRefreshToken() {
  return crypto.randomBytes(32).toString("hex")
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

async function run() {
  const userId = process.argv[2]

  if (!userId) {
    throw new Error("provide userId: node scripts/create-test-refresh-token.js <userId>")
  }

  const refreshToken = generateRefreshToken()
  const tokenHash = hashToken(refreshToken)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  await client.connect()

  await client.query(
    `
      insert into refresh_tokens (
        user_id,
        token_hash,
        expires_at
      )
      values ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt]
  )

  await client.end()

  console.log("raw refresh token:")
  console.log(refreshToken)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})