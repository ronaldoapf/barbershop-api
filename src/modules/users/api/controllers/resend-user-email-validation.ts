import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaTokensRepository } from "../../repositories/prisma/prisma-tokens.repository";
import { ForgotPasswordUseCase } from "../../use-cases/forgot-password.use-case";
import { PrismaUsersRepository } from "../../repositories/prisma/prisma-users.repository";
import { resendUserEmailValidationSchema } from "../../dtos/resend-user-email-validation-dto";
import { ResendUserEmailValidationUseCase } from "../../use-cases/resend-user-email-validation-use-case";

export const resendUserEmailValidationController: FastifyPluginAsyncZod = async app => {
  app.post("/users/email/resend", {
    schema: {
      summary: "Resend user email validation",
      description: "Endpoint to resend user email validation in the system.",
      tags: ["users"],
      body: resendUserEmailValidationSchema
    }
  }, async (request, reply) => {
    const { email } = request.body

    const usersRepository = new PrismaUsersRepository()
    const tokensRepository = new PrismaTokensRepository()

    const useCase = new ResendUserEmailValidationUseCase(usersRepository, tokensRepository)

    await useCase.execute({
      email
    })

    reply.status(200).send()
  })
}