import z from "zod";

const recoveryPasswordSchema = z.object({
  email: z.email()
})

type RecoveryPasswordDTO = z.infer<typeof recoveryPasswordSchema>

export { recoveryPasswordSchema, RecoveryPasswordDTO }