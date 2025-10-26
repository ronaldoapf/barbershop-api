import { FastifyInstance } from "fastify";
import { createUserController } from "./create-user.controller";
import { resetPasswordController } from "./reset-password.controller";
import { forgotPasswordController } from "./forgot-password.controller";
import { profileController } from "./profile.controller";
import { resendUserEmailValidationController } from "./resend-user-email-validation";
import { validateUserEmailController } from "./validate-user-email";

export function usersController(app: FastifyInstance) {
  app.register(createUserController)
  app.register(forgotPasswordController)
  app.register(resetPasswordController)
  app.register(profileController)
  app.register(resendUserEmailValidationController)
  app.register(validateUserEmailController)
}