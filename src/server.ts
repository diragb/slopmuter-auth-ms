// Packages:
import app from './app'

// Constants:
import env from './config/env'
import logger from './lib/logger'

// Execution:
app.set('trust proxy', 1)

app.listen(env.port, () => {
  logger.info(`${env.serviceName} is running on http://localhost:${env.port}`)
})
