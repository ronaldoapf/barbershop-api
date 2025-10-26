import z from "zod";

const resendUserEmailValidationSchema = z.object({
  email: z.email()
})

type ResendUserEmailValidationDTO = z.infer<typeof resendUserEmailValidationSchema>

export { resendUserEmailValidationSchema, ResendUserEmailValidationDTO }