import { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { verifyBarberJwt } from "@/middlewares/verify-barber-jwt"
import { PrismaBarbersRepository } from "../../repositories/prisma/prisma-barbers.repository"
import { DeleteBarberUseCase } from "../../use-cases/delete-barber.use-case"
import { deleteBarberParamsSchema } from "../../dtos/delete-barber-dto"

export const deleteBarberController: FastifyPluginAsyncZod = async (app) => {
  app.delete("/barbers/:id", {
    onRequest: [verifyBarberJwt],
    schema: {
      summary: "Delete barber",
      description: "Endpoint to delete a barber. Requires authentication.",
      tags: ["barbers"],
      params: deleteBarberParamsSchema
    },
  }, async (request, reply) => {
    const barbersRepository = new PrismaBarbersRepository()
    const useCase = new DeleteBarberUseCase(barbersRepository)

    const { id } = request.params

    await useCase.execute({ id })

    return reply.status(204).send()
  })
}
