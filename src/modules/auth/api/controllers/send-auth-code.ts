import { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { authWithPasswordSchema } from "../../dtos/authenticate-with-password-dto"
import { PrismaUsersRepository } from "@/modules/users/repositories/prisma/prisma-users.repository"
import { AuthenticateWithPasswordUseCase } from "../../use-cases/authenticate-with-password.usecase"
import { sendAuthCodeSchema } from "../../dtos/send-auth-code-dto"
import { SendAuthCodeUseCase } from "../../use-cases/send-auth-code.usecase."
import { PrismaUserLoginRepository } from "../../repositories/prisma-user-login.repository"

export const sendAuthCodeController: FastifyPluginAsyncZod = async app => {
  app.post("/auth/code/send", {
    schema: {
      summary: "Send auth code to user",
      description: "Endpoint to send an authentication code to the user's email.",
      tags: ["auth"],
      body: sendAuthCodeSchema
    }
  }, async (request, reply) => {
    const usersRepository = new PrismaUsersRepository()
    const userLoginRepository = new PrismaUserLoginRepository()

    const useCase = new SendAuthCodeUseCase(usersRepository, userLoginRepository)

    await useCase.execute(request.body)

    reply.status(200).send()
  })
}