import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { recoveryPasswordSchema } from "../../dtos/recovery-password-dto";
import { PrismaTokensRepository } from "../../repositories/prisma/prisma-tokens.repository";
import { ForgotPasswordUseCase } from "../../use-cases/forgot-password.use-case";
import { PrismaUsersRepository } from "../../repositories/prisma/prisma-users.repository";

export const forgotPasswordController: FastifyPluginAsyncZod = async app => {
  app.post("/users/password/forgot", {
    schema: {
      summary: "Recovery user's password",
      description: "Endpoint to recovery user's password in the system.",
      tags: ["users"],
      body: recoveryPasswordSchema
    }
  }, async (request, reply) => {
    const { email } = request.body

    const usersRepository = new PrismaUsersRepository()
    const tokensRepository = new PrismaTokensRepository()

    const useCase = new ForgotPasswordUseCase(usersRepository, tokensRepository)

    await useCase.execute({
      email
    })

    reply.status(200).send()
  })
}