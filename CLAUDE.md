# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev        # development with watch mode
npm run build            # compile TypeScript → dist/
npm run start:prod       # run compiled output
npm run lint             # ESLint + auto-fix
npm run format           # Prettier format
npm run test             # unit tests (jest)
npm run test:watch       # unit tests in watch mode
npm run test:cov         # unit tests with coverage
npm run test:e2e         # e2e tests (test/jest-e2e.json)

# Prisma
npx prisma migrate dev   # create + apply a migration
npx prisma generate      # regenerate client after schema changes
```

Run a single test file: `npx jest src/modules/<module>/application/<use-case>.spec.ts`

**Package manager: npm only.** Never use `pnpm` or `yarn`.

## Architecture Overview

NestJS 11 API following strict **Clean Architecture** with Repository + Use-Case patterns. Stack: TypeScript 5, PostgreSQL 15, Prisma 7, Passport.js (JWT + Google OAuth), AWS S3 / Cloudflare R2 (presigned URLs), Resend (email), BullMQ (async jobs), Swagger.

### Four-Layer Module Structure

Every feature module under `src/modules/<module>/` has exactly four layers:

| Layer | Contents | Key rule |
|---|---|---|
| `domain/` | Entities, enums, repository abstract classes | Plain TypeScript only — no framework imports |
| `application/` | Use cases, event listeners, unit tests | No `@nestjs/*` (except `@Injectable()` + exception classes), no `@prisma/client` |
| `dto/` | Request/response shapes | Every field has `@ApiProperty()`; input DTOs use `class-validator` |
| `infrastructure/` | Prisma repository impl, NestJS controller, NestJS module | Repository maps Prisma records → entities via `toEntity()`; controller has zero business logic |

`src/shared/` holds cross-cutting concerns: guards, decorators, global filters, `StorageService`, `MailService`, `QueueService`, pagination helpers, and pure utilities.

### Critical Rules

**Use Cases:** One class per operation with a single `execute()` method. Controllers call use cases; use cases call repositories — never the reverse or cross-contamination.

**Repository interfaces:** Declared as `abstract class` (not `interface`) so NestJS can use them as DI tokens. Wired in the module: `{ provide: ICabinetsRepository, useClass: CabinetsRepository }`.

**Soft deletes are mandatory.** Physical deletes are forbidden (outside `admin` module). Every read query must include `disabledAt: null`. Soft-delete sets `disabledAt: new Date()`.

**Prisma errors:** Catch `P2002`/`P2025` at the repository layer and re-throw as `ConflictException`/`NotFoundException`. The global `DatabaseExceptionFilter` handles remaining Prisma errors.

**Event-driven cross-module side effects:** Use `EventEmitter2` (`@nestjs/event-emitter`). Emit from use cases; listeners live in `application/` and follow the same import constraints.

**Async jobs:** Long-running work goes through `QueueService` (BullMQ). Queue processors live in `infrastructure/` and may use `PrismaService` directly.

**File storage:** Always persist `storageKey`, `url`, `mimeType`, and `size`. Validate file type by magic bytes, not MIME header. Upload flow: presigned URL → client uploads to S3 → client calls confirm endpoint → use case persists metadata.

**Pagination:** All list endpoints return `PaginatedResult<T>` (`data`, `total`, `page`, `limit`). Use `PaginationHelper.getSkipTake()` in repositories; expose `PaginationQueryDto` on query params.

**Configuration:** Access via `ConfigService` from `@nestjs/config`. Never read `process.env` directly inside modules.

### Guards & Decorators

| Guard | Decorator | Enforces |
|---|---|---|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | Valid JWT required |
| `OptionalJwtAuthGuard` | `@UseGuards(OptionalJwtAuthGuard)` | Populates user if token present; does not block |
| `RolesGuard` | `@Roles(UserRole.ADMIN)` | Platform-level role |
| `CabinetRolesGuard` | `@CabinetRoles(CabinetRole.OWNER)` | Role within a cabinet |
| `UserAccessGuard` / `DemandAccessGuard` / `ResultAccessGuard` | `@UseGuards(...)` | Resource ownership |

Authenticated user in controllers: `@CurrentUser() user: UserEntity`.

### Swagger Requirements

Every controller must have `@ApiTags()` on the class and `@ApiOperation()` + `@ApiResponse()` on every method. Protected endpoints add `@ApiBearerAuth()`.

### Testing

Unit tests live in `application/` next to the use case (`*.spec.ts`). Never instantiate `PrismaService` in tests — mock all repositories with `jest.fn()` shaped to the abstract class contract. Test only inputs, outputs, thrown exceptions, and emitted events.

### Naming Conventions

| Target | Convention | Example |
|---|---|---|
| Files | kebab-case | `create-cabinet.use-case.ts` |
| Classes | PascalCase | `CreateCabinetUseCase` |
| Interfaces / abstract repos | PascalCase prefixed `I` | `ICabinetsRepository` |
| Entities | PascalCase suffixed `Entity` | `CabinetEntity` |
| DTOs | PascalCase suffixed `Dto` | `CreateCabinetDto` |
| Variables & functions | camelCase | `findBySlug` |

**Language split:** All source code, file names, variable names, and comments in English. User-facing copy (emails, notifications, error messages shown to end users) in pt-BR.

### Commit Messages

Conventional Commits: `<type>(<scope>): <short description in English>`

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.

### Schema Changes

Any Prisma schema or core business logic change must be appended to the `CHANGELOG` section in `architecture.md` (date, what changed, why). Never modify an existing migration file — always create a new one.
