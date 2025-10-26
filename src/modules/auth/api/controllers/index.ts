import { FastifyInstance } from "fastify";
import { authenticateWithPasswordController } from "./authenticate-with-password.controller";
import { sendAuthCodeController } from "./send-auth-code";
import { authenticateWithCodeController } from "./authenticate-with-code.controller";

export function authController(app: FastifyInstance) {
  app.register(authenticateWithPasswordController)
  app.register(sendAuthCodeController)
  app.register(authenticateWithCodeController)

}