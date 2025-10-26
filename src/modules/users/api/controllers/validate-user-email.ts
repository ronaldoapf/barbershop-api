import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { recoveryPasswordSchema } from "../../dtos/recovery-password-dto";
import { PrismaTokensRepository } from "../../repositories/prisma/prisma-tokens.repository";
import { ForgotPasswordUseCase } from "../../use-cases/forgot-password.use-case";
import { PrismaUsersRepository } from "../../repositories/prisma/prisma-users.repository";
import { ValidateUserEmailUseCase } from "../../use-cases/validate-user-email-use-case";
import { validateUserEmailSchema } from "../../dtos/validate-user-email-dto";

export const validateUserEmailController: FastifyPluginAsyncZod = async app => {
  app.post("/users/email/validate", {
    schema: {
      summary: "Validate user's email",
      description: "Endpoint to validate user's email in the system.",
      tags: ["users"],
      body: validateUserEmailSchema
    }
  }, async (request, reply) => {
    const { email, token } = request.body

    const usersRepository = new PrismaUsersRepository()
    const tokensRepository = new PrismaTokensRepository()

    const useCase = new ValidateUserEmailUseCase(usersRepository, tokensRepository)

    await useCase.execute({
      email,
      token
    })

    reply.status(200).send()
  })
}