import z from "zod";

const resetPasswordSchema = z.object({
  token: z.uuid(),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});

type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;

export { resetPasswordSchema, ResetPasswordDTO };