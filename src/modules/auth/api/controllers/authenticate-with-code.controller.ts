import { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { PrismaUsersRepository } from "@/modules/users/repositories/prisma/prisma-users.repository"
import { authenticateWithCodeSchema } from "../../dtos/authenticate-with-code-dto"
import { AuthenticateWithCodeUseCase } from "../../use-cases/authenticate-with-code.usecase"
import { PrismaUserLoginRepository } from "../../repositories/prisma-user-login.repository"

export const authenticateWithCodeController: FastifyPluginAsyncZod = async app => {
  app.post("/auth/code", {
    schema: {
      summary: "Authenticate user with code",
      description: "Endpoint to authenticate a user with code.",
      tags: ["auth"],
      body: authenticateWithCodeSchema
    }
  }, async (request, reply) => {
    const usersRepository = new PrismaUsersRepository()
    const userLoginRepository = new PrismaUserLoginRepository()

    const useCase = new AuthenticateWithCodeUseCase(usersRepository, userLoginRepository)

    await useCase.execute(request.body)

    reply.status(200).send()
  })
}