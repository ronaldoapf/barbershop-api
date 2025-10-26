import { z } from 'zod'

const envSchema = z.object({
  API_URL: z.url(),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.url(),
  JWT_SECRET_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  MAILTRAP_API_KEY: z.string(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)