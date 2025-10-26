import { z } from "zod"
import { BarberRole } from "@prisma/client"

const createBarberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().optional(),
  role: z.enum(BarberRole).optional().default(BarberRole.BARBER),
  bio: z.string().optional(),
  profilePhoto: z.string().url().optional(),
})

type CreateBarberDTO = z.infer<typeof createBarberSchema>

export { createBarberSchema, CreateBarberDTO }