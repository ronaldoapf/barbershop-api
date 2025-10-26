import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaBarbersRepository } from "../../repositories/prisma/prisma-barbers.repository";
import { verifyBarberJwt } from "@/middlewares/verify-barber-jwt";
import { createBarberSchema } from "../../dtos/create-barber-dto";
import { CreateBarberUseCase } from "../../use-cases/create-barber.use-case";

export const createBarberController: FastifyPluginAsyncZod = async (app) => {
  app.post("/barbers", {
    onRequest: [verifyBarberJwt],
    schema: {
      summary: "Create a new barber",
      description: "Endpoint to create a new barber. Requires authentication.",
      tags: ["barbers"],
      body: createBarberSchema,
    },
  }, async (request, reply) => {
    const barbersRepository = new PrismaBarbersRepository()
    const useCase = new CreateBarberUseCase(barbersRepository)

    const barber = await useCase.execute(request.body)

    return reply.status(201).send({
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
