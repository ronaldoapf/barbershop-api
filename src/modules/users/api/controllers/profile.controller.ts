import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PrismaUsersRepository } from "../../repositories/prisma/prisma-users.repository";
import { GetProfileUseCase } from "../../use-cases/get-profile-use-case";
import { verifyJwt } from "@/middlewares/verify-jwt";
import z from "zod";

export const profileController: FastifyPluginAsyncZod = async app => {
  app.get("/users/me", {
    schema: {
      summary: "Get current user's profile",
      description: "Endpoint to retrieve the current user's profile.",
      tags: ["users"],
      response: {
        200: z.object({
          id: z.uuid(),
          name: z.string(),
          email: z.email(),
          isEmailVerified: z.boolean(),
          createdAt: z.date(),
          updatedAt: z.date(),
        })
      }
    },
    onRequest: [verifyJwt],
  }, async (request, reply) => {
    const usersRepository = new PrismaUsersRepository()
    const useCase = new GetProfileUseCase(usersRepository)

    const user = await useCase.execute({ id: request.user.sub })

    reply.status(200).send(user)
  })
}