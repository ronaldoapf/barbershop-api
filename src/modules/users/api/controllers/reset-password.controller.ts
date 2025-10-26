import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaTokensRepository } from "../../repositories/prisma/prisma-tokens.repository";
import { resetPasswordSchema } from "../../dtos/reset-password-dto";
import { ResetPasswordUseCase } from "../../use-cases/reset-password.use-case";
import { PrismaUsersRepository } from "../../repositories/prisma/prisma-users.repository";

export const resetPasswordController: FastifyPluginAsyncZod = async app => {
  app.post("/users/password/reset", {
    schema: {
      summary: "Reset user's password",
      description: "Endpoint to reset user's password in the system.",
      tags: ["users"],
      body: resetPasswordSchema
    }
  }, async (request, reply) => {
    const { confirmPassword, newPassword, token } = request.body

    const usersRepository = new PrismaUsersRepository()
    const tokensRepository = new PrismaTokensRepository()

    const useCase = new ResetPasswordUseCase(usersRepository, tokensRepository)

    await useCase.execute({
      token,
      newPassword,
      confirmPassword,
    })

    reply.status(200).send()
  })
}