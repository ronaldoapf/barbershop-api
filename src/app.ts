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
import { barbersModule } from "./modules/barbers/api/controllers";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { errorHandler } from "./middlewares/error-handler";
import { PasswordEncrypter } from "./lib/password-encrypter";

export const app = fastify({
  logger: env.NODE_ENV === "development"
    ? {
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
          singleLine: false,
        },
      },
    }
    : {
      level: "info",
    },
}).withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.setErrorHandler(errorHandler)

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
    onRequest: function (_request, _reply, done) {
      done()
    },
    preHandler: function (_request, _reply, done) {
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
app.register(barbersModule)


app.listen({
  port: env.PORT,
  host: '0.0.0.0',
}).then(async () => {
  const password = new PasswordEncrypter()
  console.log(await password.encrypt("akuu3xtot347"))
  app.log.info(`🚀 Server is running at ${env.API_URL}:${env.PORT}`)
  app.log.info(`📚 Swagger Docs: ${env.API_URL}:${env.PORT}/docs`)
  app.log.info(`📖 Scalar Reference: ${env.API_URL}:${env.PORT}/reference`)
}).catch((err) => {
  app.log.error(err, 'Failed to start server')
  process.exit(1)
})