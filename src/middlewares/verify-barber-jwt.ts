import { FastifyReply, FastifyRequest } from "fastify"
import { UnauthorizedError } from "@/errors/app-error"

export async function verifyBarberJwt(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify()

    // Verify this is a barber token by checking the role claim
    if (!request.user.role || request.user.role === "user") {
      throw new UnauthorizedError("Invalid token type. Barber access required.")
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return reply.status(401).send({
        error: err.message,
      })
    }

    return reply.status(401).send({
      error: "Unauthorized",
    })
  }
}
