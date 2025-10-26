import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaBarbersRepository } from "../../repositories/prisma/prisma-barbers.repository";
import { GetBarberUseCase } from "../../use-cases/get-barber.use-case";
import { getBarberParamsSchema } from "../../dtos/get-barber-dto";

export const getBarberController: FastifyPluginAsyncZod = async (app) => {
  app.get("/barbers/:id", {
    schema: {
      summary: "Get barber by ID",
      description: "Endpoint to get a specific barber.",
      tags: ["barbers"],
      params: getBarberParamsSchema
    },
  }, async (request, reply) => {
    const barbersRepository = new PrismaBarbersRepository()
    const useCase = new GetBarberUseCase(barbersRepository)

    const barber = await useCase.execute(request.params.id)

    return reply.status(200).send(barber)
  })
}
