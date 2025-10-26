# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Fastify-based REST API for a barbershop application with comprehensive user management, authentication (password + OTP), email verification, and password recovery. Built with TypeScript, Prisma ORM, PostgreSQL, and Zod validation.

## Development Commands

### Setup
```bash
pnpm install                        # Install dependencies
cp .env.example .env                # Copy environment variables
docker-compose up -d                # Start PostgreSQL database
npx prisma migrate dev              # Run database migrations
```

### Running the Application
```bash
pnpm dev                            # Start development server with hot reload (runs on port 3333)
pnpm build                          # Build for production with tsup
pnpm start                          # Start production server
pnpm studio                         # Open Prisma Studio (database GUI)
```

### Database Operations
```bash
npx prisma migrate dev              # Create and run new migration
npx prisma migrate dev --name <name> # Create named migration
npx prisma studio                   # Open database GUI
npx prisma generate                 # Regenerate Prisma Client after schema changes
npx prisma db push                  # Push schema changes without creating migration (dev only)
```

### API Documentation
- Swagger UI: http://localhost:3333/docs
- Scalar API Reference: http://localhost:3333/reference

## Architecture

### Modular Structure
The codebase follows a **domain-driven modular architecture**. Each module is self-contained with its own:
- `api/controllers/` - Fastify route handlers with Zod validation schemas
- `use-cases/` - Business logic layer (service layer)
- `repositories/` - Data access interfaces and Prisma implementations
- `dtos/` - Data transfer objects and domain types

Current modules:
- `modules/users/` - User management, email verification, password recovery
- `modules/auth/` - Password and OTP-based authentication

### Repository Pattern
All database access uses the **Repository Pattern**:
1. Interface defines the contract (e.g., `UsersRepository`)
2. Prisma implementation (e.g., `PrismaUsersRepository`)
3. Use cases depend on interfaces, not concrete implementations

When adding new database operations:
- Define the method in the repository interface first
- Implement in the Prisma repository
- Use the interface in use cases for dependency injection

### Dependency Injection
Use cases receive dependencies through constructor injection:
```typescript
export class CreateUserUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) {}
}
```

Controllers instantiate dependencies:
```typescript
const usersRepository = new PrismaUsersRepository()
const tokensRepository = new PrismaTokensRepository()
const createUserUseCase = new CreateUserUseCase(usersRepository, tokensRepository)
```

### Route Registration
Routes are organized by module and registered in `src/app.ts`:
```typescript
app.register(authController)
app.register(usersController)
```

Each controller file exports a function that registers its routes on a Fastify instance.

### Type Safety Stack
1. **Zod schemas** define and validate request/response shapes
2. **fastify-type-provider-zod** provides end-to-end type inference
3. **Prisma** generates TypeScript types from database schema
4. **DTOs** ensure type consistency across layers

### Authentication & Authorization
- JWT-based authentication with `@fastify/jwt`
- Access tokens (10min expiry) + refresh tokens (cookie-based)
- JWT secret configured via `JWT_SECRET_KEY` env var
- Protected routes use `verifyJwt` middleware from `src/middlewares/verify-jwt.ts`
- User ID available in handlers via `request.user.sub`

### Email System
- Uses Mailtrap for email delivery (`MAILTRAP_API_KEY`)
- React Email for templates with JSX syntax
- MailService in `src/lib/mail.ts` handles sending
- Templates: email verification, password reset, OTP codes

### Database Models
- **User** - User accounts with email verification status
- **Token** - Email verification and password recovery tokens (with expiration)
- **UserLogin** - OTP codes for two-factor authentication
- **Barber** - Barber profiles with roles (BARBER, MANAGER, ADMIN)

Token types are defined in the `TokenType` enum (EMAIL_VERIFICATION, PASSWORD_RECOVERY).

## Key Conventions

### Path Aliases
Use `@/` prefix for absolute imports from `src/`:
```typescript
import { PasswordEncrypter } from "@/lib/password-encrypter"
import { prisma } from "@/config/prisma"
```

### Environment Variables
All env vars are validated through Zod schema in `src/config/env.ts`. Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - JWT signing secret
- `API_URL` - Base API URL
- `PORT` - Server port (default: 3333)
- `NODE_ENV` - Environment (development/production/test)
- `MAILTRAP_API_KEY` - Email service API key
- `RESEND_API_KEY` - Alternative email service

### Error Handling
Use descriptive Error throws in use cases:
```typescript
throw new Error("User with same email already exists.")
```

Controllers should catch and return appropriate HTTP status codes.

### Prisma Client
Single Prisma Client instance exported from `src/config/prisma.ts`:
```typescript
import { prisma } from "@/config/prisma"
```

### Password Hashing
Use `PasswordEncrypter` class from `src/lib/password-encrypter.ts` (bcryptjs wrapper):
```typescript
const passwordEncrypter = new PasswordEncrypter()
const hashedPassword = await passwordEncrypter.encrypt(password)
const isValid = await passwordEncrypter.compare(plainPassword, hashedPassword)
```

## Adding New Features

### Creating a New Module
1. Create folder structure: `src/modules/{module-name}/{api,use-cases,repositories,dtos}`
2. Define repository interfaces in `repositories/`
3. Create Prisma implementations in `repositories/prisma/`
4. Implement business logic in `use-cases/`
5. Create controllers with Zod schemas in `api/controllers/`
6. Register controller in `src/app.ts`

### Adding New Routes
1. Create controller file in `api/controllers/`
2. Export async function that receives `FastifyInstance`
3. Define Zod schemas for request/response
4. Use `app.withTypeProvider<ZodTypeProvider>()` for type inference
5. Register in module's controller index file

### Database Changes
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Prisma Client types regenerate automatically
4. Update repository interfaces and implementations
