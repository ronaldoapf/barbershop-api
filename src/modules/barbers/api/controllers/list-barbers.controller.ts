import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaBarbersRepository } from "../../repositories/prisma/prisma-barbers.repository";
import { ListBarbersUseCase } from "../../use-cases/list-barbers.use-case";
import { listBarbersSchema } from "../../dtos/list-barbers-dto";

export const listBarbersController: FastifyPluginAsyncZod = async (app) => {
  app.get("/barbers", {
    schema: {
      summary: "List all barbers",
      description: "Endpoint to list all active barbers.",
      tags: ["barbers"],
      querystring: listBarbersSchema
    },
  }, async (request, reply) => {
    const barbersRepository = new PrismaBarbersRepository()
    const useCase = new ListBarbersUseCase(barbersRepository)

    const barbers = await useCase.execute(request.query)

    return reply.status(200).send({ barbers })
  })
}
