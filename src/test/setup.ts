import { beforeAll, afterAll } from 'vitest'

// Mock environment variables for testing
process.env.API_URL = 'http://localhost'
process.env.FRONTEND_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET_KEY = 'test-secret-key'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.MAILTRAP_API_KEY = 'test-mailtrap-key'
process.env.PORT = '3333'
process.env.NODE_ENV = 'test'

beforeAll(async () => {
  // Setup code before all tests
  console.log('🧪 Test suite starting...')
})

afterAll(async () => {
  // Cleanup code after all tests
  console.log('✅ Test suite completed')
})
