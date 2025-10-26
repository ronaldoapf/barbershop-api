import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaBarbersRepository } from "../../repositories/prisma/prisma-barbers.repository";
import { verifyBarberJwt } from "@/middlewares/verify-barber-jwt";
import { UpdateBarberUseCase } from "../../use-cases/update-barber.use-case";
import { updateBarberBodySchema, updateBarberParamsSchema } from "../../dtos/update-barber-dto";

export const updateBarberController: FastifyPluginAsyncZod = async (app) => {
  app.put("/barbers/:id", {
    onRequest: [verifyBarberJwt],
    schema: {
      summary: "Update barber",
      description: "Endpoint to update a barber. Requires authentication.",
      tags: ["barbers"],
      params: updateBarberParamsSchema,
      body: updateBarberBodySchema,
    },
  }, async (request, reply) => {
    const barbersRepository = new PrismaBarbersRepository()
    const useCase = new UpdateBarberUseCase(barbersRepository)

    const barber = await useCase.execute(request.params.id, request.body)

    return reply.status(200).send({
      id: barber.id,
      name: barber.name,
      email: barber.email,
      phoneNumber: barber.phoneNumber,
      role: barber.role,
      isActive: barber.isActive,
      profilePhoto: barber.profilePhoto,
      bio: barber.bio,
      createdAt: barber.createdAt,
      updatedAt: barber.updatedAt,
    })
  })
}
