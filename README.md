# SlopMuter Auth Service

Authentication microservice for **[SlopMuter](https://slopmuter.com)**, a browser extension that filters AI-generated slop and low-effort content from X/Twitter feeds.

## Overview

A stateless authentication API built with Express and TypeScript, providing Google OAuth integration with JWT-based access tokens and secure refresh token rotation. Designed for easy deployment from EC2 to ECS/Fargate.

## Features

- Google OAuth 2.0 authentication
- JWT access tokens (15 min expiry)
- Secure refresh token rotation (30 day expiry)
- PostgreSQL-backed token storage
- Dockerized for consistent deployment
- Extensible provider architecture for future OAuth providers

## Installation

```bash
npm install
```

## Getting Started

### Local Development

1. Start the local PostgreSQL database:
```bash
npm run db:start
```

2. Run database migrations:
```bash
npm run migrate
```

3. Create a `.env` file with required environment variables:
```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_service
JWT_ACCESS_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

4. Start the development server:
```bash
npm run dev
```

The service will be available at `http://localhost:8080`.

## API Endpoints

- `GET /v1/health` - Health check
- `POST /v1/auth/google` - Authenticate with Google OAuth
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Revoke refresh token

## Deployment

The service is containerized and can be deployed to EC2, ECS, or any Docker-compatible environment. See the included `Dockerfile` and `docker-compose.yml` for deployment configuration.

## Tech Stack

- Express + TypeScript
- PostgreSQL (AWS RDS)
- JWT for access tokens
- Docker
- Zod for validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature or fix branch (`git checkout -b feat/amazing-feature` or `git checkout -b fix/required-fix`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'` or `git commit -m 'fix: add required fix'`)
4. Push to the branch (`git push origin feat/amazing-feature` or `git push origin fix/required-fix`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Issues](https://github.com/diragb/slopmuter-auth-ms/issues)
- [Repository](https://github.com/diragb/slopmuter-auth-ms)
- [Author](https://github.com/diragb)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/diragb">Dirag Biswas</a>
</div>
