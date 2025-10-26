import { z } from "zod"
import { BarberRole } from "@prisma/client"

const updateBarberBodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  password: z.string().min(6).optional(),
  phoneNumber: z.string().optional().nullable(),
  role: z.enum(BarberRole).optional(),
  isActive: z.boolean().optional(),
  bio: z.string().optional().nullable(),
  profilePhoto: z.string().url().optional().nullable(),
})

const updateBarberParamsSchema = z.object({
  id: z.uuid(),
})

type UpdateBarberDTO = z.infer<typeof updateBarberBodySchema & typeof updateBarberParamsSchema>

export {
  updateBarberParamsSchema,
  updateBarberBodySchema,
  UpdateBarberDTO
}