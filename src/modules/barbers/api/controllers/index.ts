import { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { authenticateBarberController } from "./authenticate-barber.controller"
import { listBarbersController } from "./list-barbers.controller"
import { createBarberController } from "./create-barber.controller"
import { updateBarberController } from "./update-barber.controller"
import { getBarberController } from "./get-barber.controller"
import { deleteBarberController } from "./delete-barber.controller"

export const barbersModule: FastifyPluginAsyncZod = async (app) => {
  await app.register(authenticateBarberController)
  await app.register(createBarberController)
  await app.register(deleteBarberController)
  await app.register(getBarberController)
  await app.register(listBarbersController)
  await app.register(updateBarberController)
}
