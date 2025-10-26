import z from "zod";

const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(3),
  password: z.string().min(6)
})

type CreateUserDTO = z.infer<typeof createUserSchema>

export { createUserSchema, CreateUserDTO };

