import fastify from "fastify";
import { env } from "./config/env";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import fastifyCors from "@fastify/cors";
import ScalarApiReference from '@scalar/fastify-api-reference'
import { usersController } from "./modules/users/api/controllers";
import { authController } from "./modules/auth/api/controllers";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

export const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors, {
  origin: true,
})

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API Example',
      version: '0.1',
    },
  },
  transform: jsonSchemaTransform,
})


app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.register(ScalarApiReference, {
  routePrefix: '/reference',
  configuration: {
    layout: 'modern',
    theme: 'elysiajs',
  },
  hooks: {
    onRequest: function (request, reply, done) {
      done()
    },
    preHandler: function (request, reply, done) {
      done()
    },
  }
})

app.register(fastifyJwt, {
  secret: env.JWT_SECRET_KEY,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
  sign: {
    expiresIn: '10m',
  },
})

app.register(fastifyCookie)

app.register(authController)
app.register(usersController)

app.listen({
  port: env.PORT,
}).then(() => {
  console.log(`🚀 Server is running at ${env.API_URL}:${env.PORT}`)
  console.log(`🚀 Swagger Docs is running at ${env.API_URL}:${env.PORT}/docs`)
  console.log(`🚀 Scalar Reference is running at ${env.API_URL}:${env.PORT}/reference`)

})