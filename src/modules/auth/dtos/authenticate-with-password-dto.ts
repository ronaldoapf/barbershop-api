import z from "zod";

const authWithPasswordSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
})

type AuthWithPasswordDTO = z.infer<typeof authWithPasswordSchema>;

export { authWithPasswordSchema, AuthWithPasswordDTO };