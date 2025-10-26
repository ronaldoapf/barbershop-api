import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createUserSchema } from "../../dtos/create-user-dto";
import { CreateUserUseCase } from "../../use-cases/create-user.use-case";
import { PrismaUsersRepository } from "../../repositories/prisma/prisma-users.repository";
import { PrismaTokensRepository } from "../../repositories/prisma/prisma-tokens.repository";

export const createUserController: FastifyPluginAsyncZod = async app => {
  app.post("/users", {
    schema: {
      summary: "Create a new user",
      description: "Endpoint to create a new user in the system.",
      tags: ["users"],
      body: createUserSchema
    }
  }, async (request, reply) => {
    const usersRepository = new PrismaUsersRepository()
    const tokensRepository = new PrismaTokensRepository()

    const useCase = new CreateUserUseCase(usersRepository, tokensRepository)

    await useCase.execute(request.body)

    reply.status(201).send()
  })
}