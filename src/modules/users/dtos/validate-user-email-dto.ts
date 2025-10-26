import z from "zod";

const validateUserEmailSchema = z.object({
  email: z.email(),
  token: z.uuid()
})

type ValidateUserEmailDTO = z.infer<typeof validateUserEmailSchema>

export { validateUserEmailSchema, ValidateUserEmailDTO }