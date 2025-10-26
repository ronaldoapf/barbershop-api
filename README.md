# Boilerplate Fastify

A modern REST API boilerplate built with Fastify, featuring comprehensive user management, authentication, and password recovery functionality.

## What This Project Does

This is a backend API application that provides:

- **User Management**: User registration with email and password validation
- **Multi-Factor Authentication**:
  - Password-based authentication
  - OTP (One-Time Password) authentication via email codes
- **Password Recovery**: Request password reset tokens via email with React Email templates
- **Password Reset**: Secure token-based password reset system with expiration
- **Email System**: Integrated email service using Mailtrap and React Email for professional templates
- **Session Management**: Secure user session handling
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation with interactive UI

## Technologies

### Core Framework
- **[Fastify](https://fastify.dev/)** - Fast and low overhead web framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Node.js](https://nodejs.org/)** - Runtime environment

### Database & ORM
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database

### Validation & Type Safety
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod)** - Zod integration for Fastify

### Security
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing

### Documentation
- **[@fastify/swagger](https://github.com/fastify/fastify-swagger)** - OpenAPI specification generator
- **[@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)** - Interactive API documentation

### Email
- **[Nodemailer](https://nodemailer.com/)** - Email sending
- **[Mailtrap](https://mailtrap.io/)** - Email testing service

### Development Tools
- **[tsx](https://github.com/privatenumber/tsx)** - TypeScript execution with watch mode
- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[Docker Compose](https://docs.docker.com/compose/)** - Container orchestration

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- Docker & Docker Compose

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

The API will be available at `http://localhost:3333`

### API Documentation

Once the server is running, access the interactive API documentation at:
```
http://localhost:3333/docs
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm studio` - Open Prisma Studio (database GUI)

## Project Structure

```
src/
├── app.ts                    # Application entry point
├── config/                   # Configuration files
│   ├── env.ts               # Environment variables
│   └── prisma.ts            # Prisma client configuration
├── lib/                     # Utility libraries
│   ├── mail.ts              # Email service
│   └── password-encrypter.ts # Password hashing
└── modules/
    └── users/               # Users module
        ├── api/
        │   └── controllers/ # Route handlers
        ├── dtos/            # Data transfer objects
        ├── repositories/    # Data access layer
        └── use-cases/       # Business logic
```

## Features

### User Registration
Create new user accounts with email and password validation.

### Password Recovery
Users can request a password reset token that is sent to their email address.

### Password Reset
Secure token-based password reset system with expiration.

### Type Safety
Full end-to-end type safety from API requests to database queries using Zod and Prisma.

## Database Schema

- **Users**: Store user account information
- **Sessions**: Manage user authentication sessions
- **Tokens**: Handle email verification and password recovery tokens

## License

ISC