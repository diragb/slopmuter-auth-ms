// Packages:
import app from './app'

// Constants:
import env from './config/env'

// Execution:
app.set('trust proxy', 1)

app.listen(env.port, () => {
  console.log(`${env.serviceName} is running on http://localhost:${env.port}`)
})
