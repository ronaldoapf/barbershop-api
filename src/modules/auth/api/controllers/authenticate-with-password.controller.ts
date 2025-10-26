import { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { authWithPasswordSchema } from "../../dtos/authenticate-with-password-dto"
import { PrismaUsersRepository } from "@/modules/users/repositories/prisma/prisma-users.repository"
import { AuthenticateWithPasswordUseCase } from "../../use-cases/authenticate-with-password.usecase"

export const authenticateWithPasswordController: FastifyPluginAsyncZod = async app => {
  app.post("/auth/password", {
    schema: {
      summary: "Authenticate user with password",
      description: "Endpoint to authenticate a user with email and password.",
      tags: ["auth"],
      body: authWithPasswordSchema
    }
  }, async (request, reply) => {
    const usersRepository = new PrismaUsersRepository()
    const useCase = new AuthenticateWithPasswordUseCase(usersRepository)

    const user = await useCase.execute(request.body)

    const token = await reply.jwtSign({
      sub: user.id,
      name: user.name
    })

    const refreshToken = await reply.jwtSign(
      {
        sign: {
          sub: user.id,
          expiresIn: '7d',
        },
      },
    )

    return reply
      .setCookie('refreshToken', refreshToken, {
        path: '/',
        secure: true,
        sameSite: true,
        httpOnly: true,
      })
      .status(200)
      .send({
        token,
      })
  })
}