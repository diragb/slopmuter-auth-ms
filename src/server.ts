// Packages:
import app from './app'
import { closeDatabasePool, verifyDatabaseConnection } from './config/db'

// Constants:
import { env } from './config/env'
import logger from './lib/logger'

// Functions:
const startServer = async (): Promise<void> => {
  await verifyDatabaseConnection()

  app.set('trust proxy', 1)

  const server = app.listen(env.port, () => {
    logger.info(`${env.serviceName} is running on http://localhost:${env.port}`)
  })

  const shutdown = (signal: string): void => {
    logger.fatal(`${signal} received, shutting down ${env.serviceName}`)

    server.close(async serverError => {
      if (serverError) {
        logger.error({ error: serverError }, 'Error while shutting down server')
        process.exit(1)
      }

      try {
        await closeDatabasePool()
        process.exit(0)
      } catch (databaseError) {
        logger.error({ error: databaseError }, 'Error while closing database pool')
        process.exit(1)
      }
    })
  }

  process.on('sigint', () => { shutdown('sigint'); })
  process.on('sigterm', () => { shutdown('sigterm'); })
}

// Execution:
startServer().catch(error => {
  logger.error({ error: error }, 'Failed to start server')
  process.exit(1)
})
