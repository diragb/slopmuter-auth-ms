process.env['DATABASE_URL'] =
  'postgresql://test:test@localhost:5432/test_db'
process.env['JWT_ACCESS_SECRET'] =
  'test-jwt-secret-minimum-32-characters-long'
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m'
process.env['GOOGLE_CLIENT_ID'] = 'test-google-client-id'
process.env['GOOGLE_CLIENT_SECRET'] = 'test-google-client-secret'
process.env['REDIS_URL'] = 'redis://localhost:6379'
process.env['NODE_ENV'] = 'test'
process.env['ALLOWED_CALLBACK_URLS'] =
  'http://localhost:3000/auth/google/callback'
