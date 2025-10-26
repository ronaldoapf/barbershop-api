import z from "zod";

const authenticateWithCodeSchema = z.object({
  code: z.string().min(6),
  email: z.email()
})

type AuthenticateWithCodeDTO = z.infer<typeof authenticateWithCodeSchema>;

export { authenticateWithCodeSchema, AuthenticateWithCodeDTO };