import z from "zod";

const getBarberParamsSchema = z.object({
  id: z.uuid(),
})

type GetBarberDTO = z.infer<typeof getBarberParamsSchema>;

export { getBarberParamsSchema, GetBarberDTO };