import z from "zod";

const listBarbersSchema = z.object({
  isActive: z.coerce.boolean().optional(),
  skip: z.coerce.number().optional(),
  take: z.coerce.number().optional(),
})

type ListBarbersDTO = z.infer<typeof listBarbersSchema>;

export { listBarbersSchema, ListBarbersDTO };
