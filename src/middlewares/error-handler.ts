import { FastifyError, FastifyReply, FastifyRequest } from "fastify"
import { ZodError } from "zod"
import { AppError } from "@/errors/app-error"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"

export async function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({ error: error.issues }, "Validation error")
    return reply.status(400).send({
      error: "Validation error",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    })
  }

  // Handle custom application errors
  if (error instanceof AppError) {
    logger.warn(
      { statusCode: error.statusCode, message: error.message },
      "Application error"
    )
    return reply.status(error.statusCode).send({
      error: error.message,
    })
  }

  // Handle Fastify errors (including JWT errors)
  if ("statusCode" in error && error.statusCode) {
    logger.warn(
      { statusCode: error.statusCode, message: error.message },
      "Fastify error"
    )
    return reply.status(error.statusCode).send({
      error: error.message,
    })
  }

  // Log unexpected errors
  logger.error({ err: error }, "Unexpected error occurred")

  // Don't expose internal error details in production
  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message || "Internal server error"

  return reply.status(500).send({
    error: message,
  })
}
