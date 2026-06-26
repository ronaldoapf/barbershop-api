# Barbershop API — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete project foundation — all npm packages, Prisma schema with every domain table, PrismaService, global exception filter, pagination utilities, and Swagger — so that every subsequent feature plan starts from a clean, running base.

**Architecture:** NestJS 11 monolith following strict Clean Architecture (four-layer modules: domain / application / dto / infrastructure). A `src/shared/` layer holds cross-cutting concerns: PrismaService, filters, pagination helpers. PostgreSQL 15 via Prisma 7 ORM.

**Tech Stack:** NestJS 11, TypeScript 5, PostgreSQL 15, Prisma 7, @nestjs/config, @nestjs/swagger, class-validator, class-transformer, @nestjs/bullmq, bullmq, @nestjs/event-emitter, @nestjs/passport, passport-jwt, passport-google-oauth20

## Global Constraints

- Package manager: npm only — never pnpm or yarn
- All source code, file names, variable names, and comments in English
- User-facing copy (error messages shown to end users) in pt-BR
- Soft deletes mandatory on every entity: `disabledAt DateTime?`; reads always filter `WHERE disabledAt IS NULL`
- Never read `process.env` directly inside modules — use `ConfigService` from `@nestjs/config`
- Prices stored as integer cents (R$10,50 → 1050)
- File names: kebab-case; classes: PascalCase; variables/functions: camelCase

---

## File Structure

```
.env.example                                           ← create
prisma/
  schema.prisma                                        ← create
src/
  main.ts                                              ← modify
  app.module.ts                                        ← modify
  shared/
    domain/
      pagination.interface.ts                          ← create
    application/
      pagination.helper.ts                             ← create
      pagination.helper.spec.ts                        ← create
      pagination-query.dto.ts                          ← create
    filters/
      database-exception.filter.ts                     ← create
      database-exception.filter.spec.ts                ← create
    infrastructure/
      prisma.service.ts                                ← create
      prisma.module.ts                                 ← create
```

---

### Task 1: Install Dependencies & Environment Setup

**Files:**
- Create: `.env.example`
- Create: `.env` (local only, never committed)
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: `ConfigModule` globally available; all required packages resolvable

- [ ] **Step 1: Install runtime packages**

```bash
npm install @nestjs/config @nestjs/swagger @nestjs/passport passport passport-jwt @nestjs/jwt passport-google-oauth20 @nestjs/event-emitter @nestjs/bullmq bullmq
```

Expected: packages added to `node_modules/` and `package.json` dependencies.

- [ ] **Step 2: Install dev type packages**

```bash
npm install --save-dev @types/passport-jwt @types/passport-google-oauth20
```

- [ ] **Step 3: Create `.env.example`**

```bash
DATABASE_URL="postgresql://admin:admin@localhost:5432/barbershop?schema=public"
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
RESEND_API_KEY=
SMS_PROVIDER_API_KEY=
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3001
PORT=3000
```

- [ ] **Step 4: Create `.env` from the example**

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` with your local PostgreSQL credentials. Leave the other secrets blank for now.

- [ ] **Step 5: Ensure `.env` is in `.gitignore`**

Open `.gitignore` (create it if it doesn't exist) and verify it contains at minimum:

```
.env
dist/
node_modules/
```

- [ ] **Step 6: Update `src/app.module.ts` with ConfigModule**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Verify the app compiles**

```bash
npm run build
```

Expected: `dist/` folder created with zero TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore src/app.module.ts
git commit -m "chore: install dependencies and configure environment"
```

---

### Task 2: Prisma Schema & Initial Migration

**Files:**
- Create: `prisma/schema.prisma`

**Interfaces:**
- Produces: all 13 domain tables in PostgreSQL; `@prisma/client` types available for all subsequent tasks

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` created. Ignore any `.env` changes (you already have it).

- [ ] **Step 2: Replace `prisma/schema.prisma` with the full domain schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CUSTOMER
  BARBER
  OWNER
}

enum OAuthProvider {
  GOOGLE
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

enum ItemStatus {
  ACTIVE
  INACTIVE
}

enum WorkingHoursType {
  WEEKLY
  SPECIFIC_DATE
}

enum LoyaltyTransactionType {
  EARN
  REDEEM
}

model User {
  id               String    @id @default(uuid())
  name             String
  email            String    @unique
  phone            String?
  passwordHash     String?
  role             UserRole  @default(CUSTOMER)
  loyaltyPoints    Int       @default(0)
  avatarUrl        String?
  avatarStorageKey String?
  createdAt        DateTime  @default(now())
  disabledAt       DateTime?

  accounts             Account[]
  sessions             Session[]
  barber               Barber?
  customerAppointments Appointment[]        @relation("CustomerAppointments")
  loyaltyTransactions  LoyaltyTransaction[]
}

model Account {
  id                String        @id @default(uuid())
  userId            String
  provider          OAuthProvider
  providerAccountId String
  createdAt         DateTime      @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([provider, providerAccountId])
}

model Session {
  id               String   @id @default(uuid())
  userId           String
  refreshTokenHash String
  userAgent        String?
  ipAddress        String?
  expiresAt        DateTime
  createdAt        DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Barber {
  id                   String    @id @default(uuid())
  userId               String    @unique
  commissionPercentage Decimal   @db.Decimal(5, 2)
  createdAt            DateTime  @default(now())
  disabledAt           DateTime?

  user         User                 @relation(fields: [userId], references: [id])
  workingHours BarberWorkingHours[]
  appointments Appointment[]        @relation("BarberAppointments")
}

model Category {
  id         String    @id @default(uuid())
  name       String
  order      Int
  createdAt  DateTime  @default(now())
  disabledAt DateTime?

  services Service[]
}

model Service {
  id              String     @id @default(uuid())
  categoryId      String?
  name            String
  description     String?
  price           Int
  durationMinutes Int
  status          ItemStatus @default(ACTIVE)
  order           Int
  pointsEarned    Int        @default(0)
  pointsRequired  Int        @default(0)
  createdAt       DateTime   @default(now())
  disabledAt      DateTime?

  category            Category?            @relation(fields: [categoryId], references: [id])
  packageServices     PackageService[]
  appointmentServices AppointmentService[]
}

model Package {
  id             String     @id @default(uuid())
  name           String
  description    String?
  price          Int
  status         ItemStatus @default(ACTIVE)
  order          Int
  pointsEarned   Int        @default(0)
  pointsRequired Int        @default(0)
  createdAt      DateTime   @default(now())
  disabledAt     DateTime?

  packageServices PackageService[]
  appointments    Appointment[]
}

model PackageService {
  id        String @id @default(uuid())
  packageId String
  serviceId String

  package Package @relation(fields: [packageId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])

  @@unique([packageId, serviceId])
}

model BarberWorkingHours {
  id         String           @id @default(uuid())
  barberId   String
  type       WorkingHoursType
  dayOfWeek  Int?
  date       DateTime?        @db.Date
  startTime  String?
  endTime    String?
  isWorking  Boolean          @default(true)
  createdAt  DateTime         @default(now())
  disabledAt DateTime?

  barber Barber @relation(fields: [barberId], references: [id])
}

model Appointment {
  id                 String            @id @default(uuid())
  customerId         String
  barberId           String
  packageId          String?
  startsAt           DateTime
  endsAt             DateTime?
  totalAmount        Int
  status             AppointmentStatus @default(PENDING)
  cancellationReason String?
  cancelledBy        String?
  cancelledAt        DateTime?
  createdAt          DateTime          @default(now())
  disabledAt         DateTime?

  customer            User                 @relation("CustomerAppointments", fields: [customerId], references: [id])
  barber              Barber               @relation("BarberAppointments", fields: [barberId], references: [id])
  package             Package?             @relation(fields: [packageId], references: [id])
  appointmentServices AppointmentService[]
  loyaltyTransactions LoyaltyTransaction[]
}

model AppointmentService {
  id                 String   @id @default(uuid())
  appointmentId      String
  serviceId          String
  serviceName        String
  price              Int
  durationMinutes    Int
  pointsEarned       Int      @default(0)
  redeemedWithPoints Boolean  @default(false)
  createdAt          DateTime @default(now())

  appointment Appointment @relation(fields: [appointmentId], references: [id])
  service     Service     @relation(fields: [serviceId], references: [id])
}

model LoyaltyTransaction {
  id            String                 @id @default(uuid())
  customerId    String
  appointmentId String?
  type          LoyaltyTransactionType
  points        Int
  description   String
  createdAt     DateTime               @default(now())

  customer    User         @relation(fields: [customerId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
}

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 3: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected:
```
Applying migration `20260626000000_init`
Your database is now in sync with your schema.
```

- [ ] **Step 4: Generate the Prisma client**

```bash
npx prisma generate
```

Expected: `@prisma/client` types regenerated in `node_modules/.prisma/client/`.

- [ ] **Step 5: Verify all tables were created**

```bash
npx prisma studio
```

Open http://localhost:5555. You should see all 13 models: User, Account, Session, Barber, Category, Service, Package, PackageService, BarberWorkingHours, Appointment, AppointmentService, LoyaltyTransaction, Setting. Close with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "chore: add full prisma schema and initial migration"
```

---

### Task 3: PrismaService & PrismaModule

**Files:**
- Create: `src/shared/infrastructure/prisma.service.ts`
- Create: `src/shared/infrastructure/prisma.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: `PrismaService` — injectable NestJS provider wrapping `PrismaClient`; `PrismaModule` — `@Global()` module that exports `PrismaService` to all feature modules without needing to re-import

- [ ] **Step 1: Create `src/shared/infrastructure/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 2: Create `src/shared/infrastructure/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Import `PrismaModule` in `src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/infrastructure/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: Verify the app starts and connects to the database**

```bash
npm run start:dev
```

Expected: no errors in the console, server listening on port 3000. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/shared/infrastructure/prisma.service.ts src/shared/infrastructure/prisma.module.ts src/app.module.ts
git commit -m "feat: add PrismaService and global PrismaModule"
```

---

### Task 4: DatabaseExceptionFilter

**Files:**
- Create: `src/shared/filters/database-exception.filter.ts`
- Create: `src/shared/filters/database-exception.filter.spec.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: `DatabaseExceptionFilter` — globally registered `@Catch(Prisma.PrismaClientKnownRequestError)` filter; maps P2002 → HTTP 409, P2025 → HTTP 404, everything else → HTTP 500

- [ ] **Step 1: Write the failing tests**

Create `src/shared/filters/database-exception.filter.spec.ts`:

```typescript
import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseExceptionFilter } from './database-exception.filter';

function makeMockHost(statusFn: jest.Mock, jsonFn: jest.Mock): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusFn, json: jsonFn }),
    }),
  } as unknown as ArgumentsHost;
}

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;

  beforeEach(() => {
    filter = new DatabaseExceptionFilter();
  });

  it('maps P2002 to 409', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const exception = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.0.0',
    });

    filter.catch(exception, makeMockHost(status, json));

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('maps P2025 to 404', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const exception = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.0.0',
    });

    filter.catch(exception, makeMockHost(status, json));

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('maps unknown Prisma codes to 500', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const exception = new Prisma.PrismaClientKnownRequestError('Unknown error', {
      code: 'P9999',
      clientVersion: '7.0.0',
    });

    filter.catch(exception, makeMockHost(status, json));

    expect(status).toHaveBeenCalledWith(500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/shared/filters/database-exception.filter.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './database-exception.filter'`.

- [ ] **Step 3: Implement `src/shared/filters/database-exception.filter.ts`**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusMap: Record<string, number> = {
      P2002: HttpStatus.CONFLICT,
      P2025: HttpStatus.NOT_FOUND,
    };

    const status = statusMap[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message: exception.message,
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/shared/filters/database-exception.filter.spec.ts --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Register the filter globally in `src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseExceptionFilter } from './shared/filters/database-exception.filter';
import { PrismaModule } from './shared/infrastructure/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/filters/ src/app.module.ts
git commit -m "feat: add DatabaseExceptionFilter for Prisma P2002/P2025 error mapping"
```

---

### Task 5: Pagination Utilities

**Files:**
- Create: `src/shared/domain/pagination.interface.ts`
- Create: `src/shared/application/pagination.helper.ts`
- Create: `src/shared/application/pagination.helper.spec.ts`
- Create: `src/shared/application/pagination-query.dto.ts`

**Interfaces:**
- Produces:
  - `PaginatedResult<T>` — `{ data: T[]; total: number; page: number; limit: number }`
  - `PaginationHelper.getSkipTake(page: number, limit: number)` — `{ skip: number; take: number }`
  - `PaginationQueryDto` — `{ page: number; limit: number }` with class-validator + Swagger decorators

- [ ] **Step 1: Write the failing test**

Create `src/shared/application/pagination.helper.spec.ts`:

```typescript
import { PaginationHelper } from './pagination.helper';

describe('PaginationHelper.getSkipTake', () => {
  it('returns skip=0 take=20 for page 1 limit 20', () => {
    expect(PaginationHelper.getSkipTake(1, 20)).toEqual({ skip: 0, take: 20 });
  });

  it('returns skip=20 take=20 for page 2 limit 20', () => {
    expect(PaginationHelper.getSkipTake(2, 20)).toEqual({ skip: 20, take: 20 });
  });

  it('returns skip=40 take=10 for page 5 limit 10', () => {
    expect(PaginationHelper.getSkipTake(5, 10)).toEqual({ skip: 40, take: 10 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/shared/application/pagination.helper.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './pagination.helper'`.

- [ ] **Step 3: Create `src/shared/domain/pagination.interface.ts`**

```typescript
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 4: Create `src/shared/application/pagination.helper.ts`**

```typescript
export class PaginationHelper {
  static getSkipTake(page: number, limit: number): { skip: number; take: number } {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx jest src/shared/application/pagination.helper.spec.ts --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 6: Create `src/shared/application/pagination-query.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/shared/domain/ src/shared/application/
git commit -m "feat: add PaginatedResult, PaginationHelper, and PaginationQueryDto"
```

---

### Task 6: Swagger & main.ts Bootstrap

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Produces: Swagger UI at `/api`; global `ValidationPipe` with whitelist, transform, and forbidNonWhitelisted

- [ ] **Step 1: Update `src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('Barbershop API')
    .setDescription('API de gerenciamento de barbearia')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

- [ ] **Step 2: Start the dev server**

```bash
npm run start:dev
```

Expected: `[NestApplication] Nest application successfully started` in the console on port 3000.

- [ ] **Step 3: Verify Swagger UI**

Open http://localhost:3000/api in a browser. You should see the Swagger UI with title "Barbershop API" and a lock icon for Bearer auth. Stop the server with Ctrl+C.

- [ ] **Step 4: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass — `DatabaseExceptionFilter` (3), `PaginationHelper` (3), `AppController` (1).

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: configure Swagger UI and global ValidationPipe"
```

---

## Plan Self-Review

**Spec coverage:**
- ✅ All 13 Prisma models defined: User, Account, Session, Barber, Category, Service, Package, PackageService, BarberWorkingHours, Appointment, AppointmentService, LoyaltyTransaction, Setting
- ✅ All 6 enums: UserRole, OAuthProvider, AppointmentStatus, ItemStatus, WorkingHoursType, LoyaltyTransactionType
- ✅ `ConfigModule` registered globally — `ConfigService` available to all future modules
- ✅ `DatabaseExceptionFilter` maps P2002 → 409, P2025 → 404, unknown → 500
- ✅ `PaginatedResult<T>`, `PaginationHelper.getSkipTake()`, `PaginationQueryDto` created
- ✅ Swagger UI at `/api` with Bearer auth
- ✅ Global `ValidationPipe` with whitelist + transform + forbidNonWhitelisted
- ✅ `PrismaModule` is `@Global()` — no need to re-import in feature modules

**Deferred to subsequent plans:**
- Auth guards, JWT, Google OAuth, decorators → Plan 2
- All feature module CRUD (users, services, schedules, appointments) → Plans 2–5
- BullMQ / EventEmitter module registration → Plan 6
- Owner seed script → Plan 2
- StorageService (S3/R2), MailService (Resend), SmsService → Plan 6
