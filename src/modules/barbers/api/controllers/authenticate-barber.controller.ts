import { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { authenticateBarberSchema } from "../../dtos/authenticate-barber-dto"
import { PrismaBarbersRepository } from "../../repositories/prisma/prisma-barbers.repository"
import { AuthenticateBarberUseCase } from "../../use-cases/authenticate-barber.use-case"

export const authenticateBarberController: FastifyPluginAsyncZod = async (
  app
) => {
  app.post("/barbers/auth/login", {
    schema: {
      summary: "Authenticate barber with password",
      description: "Endpoint to authenticate a barber with email and password.",
      tags: ["barbers"],
      body: authenticateBarberSchema,
    },
  }, async (request, reply) => {
    const barbersRepository = new PrismaBarbersRepository()
    const useCase = new AuthenticateBarberUseCase(barbersRepository)

    const barber = await useCase.execute(request.body)

    const token = await reply.jwtSign({
      sub: barber.id,
      name: barber.name,
      role: "barber" as const,
    })

    const refreshToken = await reply.jwtSign(
      {
        sub: barber.id,
        role: "barber" as const,
      },
      {
        expiresIn: "7d",
      }
    )

    return reply
      .setCookie("refreshToken", refreshToken, {
        path: "/",
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
