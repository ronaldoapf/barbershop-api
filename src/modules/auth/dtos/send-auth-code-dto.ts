import z from "zod";

const sendAuthCodeSchema = z.object({
  email: z.email(),
})

type SendAuthCodeDTO = z.infer<typeof sendAuthCodeSchema>;

export { sendAuthCodeSchema, SendAuthCodeDTO };