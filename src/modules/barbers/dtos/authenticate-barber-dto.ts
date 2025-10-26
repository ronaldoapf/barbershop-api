import { z } from "zod"

export const authenticateBarberSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type AuthenticateBarberDTO = z.infer<typeof authenticateBarberSchema>
