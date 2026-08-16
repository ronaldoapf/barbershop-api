# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a **NestJS starter scaffold** — `src/` currently only contains the default `AppModule`/`AppController`/`AppService`, and `prisma/schema.prisma` has no models yet. `architecture.md` and `spec-en.md`/`spec-ptbr.md` describe the target system (a Barbershop Management API) and its mandatory architecture; nothing described there is implemented yet. When building features, follow those documents as the spec/constitution rather than inferring conventions from existing code.

- `architecture.md` — binding architectural rules (Clean Architecture, layer boundaries, naming, patterns). Treat every rule in it as a hard constraint, not a suggestion.
- `spec-en.md` / `spec-ptbr.md` — identical-content product/domain specification (roles, data model, business rules) in English and Portuguese.

## Commands

Node version is pinned to **24.14** via `.nvmrc`. Run `nvm use` (or `nvm use 24.14`) before any `npm`/`node`/`npx` command below — every shell must do this, not just the first one, since a fresh shell defaults to whatever `nvm`'s default alias is, not this project's version.

```bash
nvm use                # switch this shell to the pinned Node version (24.14)

npm install             # install deps (npm only — never pnpm/yarn)

npm run start:dev      # dev server, watch mode
npm run start          # dev server, no watch
npm run start:prod     # run compiled dist/main.js
npm run build          # nest build

npm run lint           # eslint --fix over src/apps/libs/test
npm run format         # prettier --write over src/ and test/

npm run test           # unit tests (jest, rootDir: src, matches *.spec.ts)
npm run test:watch
npm run test:cov
npm run test:e2e       # e2e tests (jest config: test/jest-e2e.json)
npm run test:debug     # unit tests with --inspect-brk, run in band

# run a single unit test file
npx jest src/modules/<module>/application/<name>.use-case.spec.ts

# Prisma
npx prisma migrate dev   # create + apply a migration (never edit an existing migration file)
npx prisma generate       # regenerate Prisma client after schema.prisma changes
```

Prisma config lives in `prisma.config.ts` (schema at `prisma/schema.prisma`, migrations at `prisma/migrations`), not in `package.json`. `DATABASE_URL` is read from `.env` via `dotenv/config`.

## Architecture (mandatory, from `architecture.md`)

Stack: Node.js 24.14 (via nvm — see Commands above), NestJS 11, TypeScript 5, PostgreSQL via Prisma 7 (driver adapter `@prisma/adapter-pg`), Passport (JWT + Google OAuth), S3/R2 file storage via presigned URLs, Resend for email, Swagger for HTTP docs, BullMQ-backed `QueueService` for async jobs, `EventEmitter2` for cross-module events.

### Four-layer module structure

Every feature module under `src/modules/<module>/` must have exactly these four directories:

```
<module>/
├── application/      # use cases (one class per operation, execute()) + @OnEvent listeners
├── domain/            # entities, enums, repository abstract classes — plain TS, no decorators
├── dto/               # request/response DTOs — class-validator + @ApiProperty
└── infrastructure/    # Prisma repositories, controllers, the NestJS module
```

Shared cross-cutting code lives in `src/shared/` (`decorators/`, `guards/`, `filters/`, `infrastructure/`, `mail/`, `utils/`, `validators/`, `application/` for things like pagination helpers).

**Import boundaries are enforced by convention, not tooling** — `domain/` and `application/` must never import from `@prisma/client`, and `application/` must never import `@nestjs/*` except `@Injectable()` and exception classes (`NotFoundException`, `ConflictException`, etc.). Repository interfaces are `abstract class`, not `interface`, so they work as NestJS DI tokens (e.g. `ICabinetsRepository`). Controllers inject use cases directly and must contain no business logic; use cases inject repository interfaces (never Prisma or controllers).

### Key conventions to enforce everywhere

- **Naming**: files kebab-case (`create-cabinet.use-case.ts`), classes PascalCase, repository interfaces `I`-prefixed PascalCase (`ICabinetsRepository`), entities suffixed `Entity`, DTOs suffixed `Dto`, enums PascalCase, variables/functions camelCase.
- **Soft deletes are mandatory** — physical deletes are forbidden outside the `admin` module. Every read query must filter `disabledAt: null`; deletes set `disabledAt: new Date()` instead of removing rows.
- **Prisma error handling**: catch unique-constraint violations (`P2002`) at the repository layer and rethrow as domain exceptions (e.g. `ConflictException`) when a custom message is needed; the global `DatabaseExceptionFilter` maps remaining `P2002`→409 and `P2025`→404. Raw Prisma errors must never reach controllers.
- **Controllers/Swagger**: every controller class needs `@ApiTags`, every method needs `@ApiOperation` and `@ApiResponse` for the primary success case, protected endpoints need `@ApiBearerAuth()`.
- **Guards**: `JwtAuthGuard`/`OptionalJwtAuthGuard` for auth, `RolesGuard`+`@Roles()` for platform-level role checks, `CabinetRolesGuard`+`@CabinetRoles()` for per-resource role checks, plus resource-ownership guards (`UserAccessGuard`, `DemandAccessGuard`, `ResultAccessGuard`). Get the authenticated user via `@CurrentUser()`.
- **Events**: use `EventEmitter2`/`@OnEvent` for cross-module side effects instead of direct cross-module imports, to avoid circular dependencies. Listeners live in `application/` and follow the same import constraints as use cases.
- **Async work**: anything long-running/deferred goes through `QueueService.add(...)` (BullMQ) rather than running synchronously in the request cycle — but this isn't wired up yet (no `bullmq`/`ioredis` dependency installed); nothing built so far needs true background work, so don't add it speculatively. Invite emails, for instance, call `MailService` directly and await it inline (`plan.md` decision #6). Queue processors, whenever a phase actually needs them, live in `infrastructure/` and may use `PrismaService` directly.
- **File storage**: always persist `storageKey` + `url` + `mimeType` + `size` together; validate uploaded file type by magic bytes, not the MIME header. Flow is presigned URL → client uploads directly to S3 → client confirms → use case persists metadata.
- **Pagination**: list endpoints return `{ data, total, page, limit }`; derive `skip`/`take` via `PaginationHelper.getSkipTake(params)` in the repository, and accept params via `PaginationQueryDto`.
- **Config**: always go through `ConfigService` (`@nestjs/config`) — never read `process.env` directly inside modules.
- **Unit tests** live beside the use case in `application/` as `*.spec.ts`, must not instantiate `PrismaService`, and mock repository interfaces with `jest.fn()` per the abstract-class contract. Test use-case behavior (inputs/outputs/thrown exceptions/emitted events) only, not private methods or repository internals.
- **Schema changes**: any Prisma schema or core business-logic change must be appended to a `CHANGELOG` section in `architecture.md` (date, what changed, why). Never modify an existing migration file — always create a new one.
- **Language split**: product-facing copy (emails, notifications, user-facing error messages) is pt-BR; all code, identifiers, comments, and technical docs are English.
- **Commits**: Conventional Commits (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`) with an English description, e.g. `feat(cabinets): add slug uniqueness check`.

## Domain model (from `spec-en.md`)

Single-tenant barbershop management API (one barbershop per instance). Booking happens via both an authenticated web/app platform and an external WhatsApp chatbot module that calls this API using a service API key (`ServiceApiKeyGuard`) instead of a user JWT.

- **Roles** live on a single `User` entity via a `role` field: `OWNER` (full admin), `BARBER` (own appointments/hours/commission, commission is read-only for them), `CUSTOMER` (own bookings + loyalty points). Authorization combines role-gated routes (`RolesGuard`), automatic query-level scoping by `barberId`/`customerId` for reads, and `AppointmentOwnershipGuard` for writes.
- **Money** is stored as integers in cents everywhere.
- **Core entities**: `User` (identity for all roles; `Account` table links Google OAuth), `Barber` (1:1 extension of `User` for barber-specific data like `commissionPercentage`), `BarberInvite` (email invite flow with hashed single-use tokens), `Service` (catalog with `pointsEarned`/`pointsRequired`), `BarberWorkingHours` (`WEEKLY` recurring + `SPECIFIC_DATE` exceptions, the latter taking priority), `Appointment` (booking with dynamic-duration slots, not a fixed grid), `AppointmentService` (join table that snapshots service name/price/duration at booking time), `LoyaltyTransaction` (auditable points ledger complementing the denormalized `User.loyaltyPoints`), `CompletedService` (commission record), `Setting` (generic key-value config for things like default commission).
- **Concurrency-sensitive rules**: appointment creation must re-check for conflicts inside a `$transaction` before confirming (prevent double-booking); loyalty point earn/redeem must update `User.loyaltyPoints` and write the `LoyaltyTransaction` atomically in the same transaction. Points are only debited/credited when an appointment is marked `COMPLETED`, never at booking time.
- **Open decision** (see spec §6): whether barbers earn commission on point-redeemed (free) services — flagged as a possible `Setting` entry rather than a hardcoded rule.
