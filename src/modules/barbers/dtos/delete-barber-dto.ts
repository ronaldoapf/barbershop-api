import z from "zod";

const deleteBarberParamsSchema = z.object({
  id: z.uuid(),
})

type DeleteBarberDTO = z.infer<typeof deleteBarberParamsSchema>;

export { deleteBarberParamsSchema, DeleteBarberDTO };