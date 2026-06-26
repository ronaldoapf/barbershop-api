# Architecture & Constraints

This repository is a **NestJS** API following strict **Clean Architecture** with the Repository Pattern and Use-Case Pattern. Every feature module enforces a hard separation between domain logic, application orchestration, infrastructure, and HTTP contracts.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 15 (Docker) |
| ORM | Prisma 7 |
| Auth | Passport.js — JWT + Google OAuth |
| File Storage | AWS S3 / Cloudflare R2 (presigned URLs) |
| Email | Resend |
| HTTP Docs | Swagger (`@nestjs/swagger`) |
| Package Manager | npm |

---

## Runtime & Package Manager

- **Package manager: npm.** Never use `pnpm` or `yarn`. All install, add, and script commands must go through `npm`.

```bash
# correct
npm install
npm add zod
npm start:dev

# wrong
pnpm install
yarn add zod
```

---

## Global Constraints

### Language Split

- **Product Layer (pt-BR):** copy visible to end users — email templates, notification messages, user-facing error messages.
- **Engineering Layer (English):** all source code, file names, folder names, variable names, comments, and technical documentation.

### Naming Conventions

| Target | Convention | Example |
|---|---|---|
| Files | kebab-case | `create-cabinet.use-case.ts` |
| Classes | PascalCase | `CreateCabinetUseCase` |
| Interfaces | PascalCase prefixed with `I` | `ICabinetsRepository` |
| Entities | PascalCase suffixed with `Entity` | `CabinetEntity` |
| DTOs | PascalCase suffixed with `Dto` | `CreateCabinetDto` |
| Enums | PascalCase | `CabinetRole` |
| Variables & functions | camelCase | `findBySlug` |

### Commit Messages — Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```
<type>(<scope>): <short description in English>
```

| Type | When to use |
|---|---|
| `feat` | new feature or capability |
| `fix` | bug fix |
| `refactor` | no logic change |
| `chore` | build process, deps, tooling |
| `docs` | documentation only |
| `test` | adding or updating tests |

---

## Directory Structure

```
src/
├── modules/
│   └── <module>/
│       ├── application/      # Use cases + event listeners — no NestJS/Prisma imports
│       ├── domain/           # Entities, enums, repository abstract classes
│       ├── dto/              # Request/response shapes (class-validator + @ApiProperty)
│       └── infrastructure/   # Prisma repositories, NestJS controllers, NestJS module
├── shared/
│   ├── application/          # Shared helpers (pagination)
│   ├── decorators/           # @CurrentUser, @Roles, @CabinetRoles, @RequireFeature
│   ├── domain/               # Shared interfaces (pagination, storage service contract)
│   ├── filters/              # Global exception filters
│   ├── guards/               # JwtAuthGuard, RolesGuard, CabinetRolesGuard, etc.
│   ├── infrastructure/       # StorageService, DiscordService, QueueService
│   ├── mail/                 # MailService (application) + ResendMailService (infrastructure)
│   ├── utils/                # Pure utility functions (slug generation, file validation)
│   └── validators/           # Custom class-validator validators (magic-bytes check)
└── main.ts
```

---

## 1. Module Structure — Four Layers

Every feature module must follow this exact four-layer layout:

```
src/modules/cabinets/
├── application/
│   ├── create-cabinet.use-case.ts
│   ├── create-cabinet.use-case.spec.ts
│   └── cabinet-scoring.listener.ts
├── domain/
│   ├── cabinet.entity.ts
│   ├── cabinet-role.enum.ts
│   └── cabinets.repository.interface.ts
├── dto/
│   ├── create-cabinet.dto.ts
│   └── cabinet-response.dto.ts
└── infrastructure/
    ├── cabinets.repository.ts
    ├── cabinets.controller.ts
    └── cabinets.module.ts
```

### Layer Rules

**`domain/`**
- Plain TypeScript classes only — no decorators, no framework imports.
- Repository interfaces are declared as `abstract class` (not `interface`) so NestJS can use them as injection tokens.
- Entities carry no methods; they are plain property bags.

**`application/`**
- One class per operation with a single public `execute()` method, decorated `@Injectable()`.
- Must **never** import from `@nestjs/*` (except `@Injectable()` and exception classes like `NotFoundException`, `ConflictException`) or from `@prisma/client`.
- Receives repository interfaces via constructor injection; the concrete implementation is wired in the module.
- Event listeners (`@OnEvent`) live here too, following the same import constraints.

**`dto/`**
- Every field carries `@ApiProperty()` or `@ApiPropertyOptional()`.
- Input DTOs use `class-validator` decorators (`@IsString`, `@IsOptional`, `@MaxLength`, etc.).
- Response DTOs map plain entity fields to a stable public shape.

**`infrastructure/`**
- **Repository:** implements the domain abstract class; injects `PrismaService`; maps Prisma records to entities via a private `toEntity()` method; never returns raw Prisma types.
- **Controller:** injects use-case classes directly; applies guards and Swagger decorators; delegates immediately to use cases without adding business logic.
- **Module:** wires repository implementations to their abstract tokens using `{ provide: IXxxRepository, useClass: XxxRepository }`.

---

## 2. Repository Pattern

### Abstract Contract (`domain/`)

```typescript
export abstract class ICabinetsRepository {
  abstract create(data: { name: string; slug: string }): Promise<CabinetEntity>;
  abstract findBySlug(slug: string): Promise<CabinetEntity | null>;
  abstract softDelete(id: string): Promise<void>;
}
```

### Implementation (`infrastructure/`)

```typescript
@Injectable()
export class CabinetsRepository implements ICabinetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<CabinetEntity | null> {
    const record = await this.prisma.cabinet.findFirst({
      where: { slug, disabledAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: Cabinet): CabinetEntity {
    // map Prisma model → domain entity
  }
}
```

### Module Wiring

```typescript
@Module({
  providers: [
    { provide: ICabinetsRepository, useClass: CabinetsRepository },
    CreateCabinetUseCase,
  ],
  controllers: [CabinetsController],
  exports: [ICabinetsRepository, CreateCabinetUseCase],
})
export class CabinetsModule {}
```

---

## 3. Use-Case Pattern

Each operation is a separate injectable class with a single `execute()` method.

```typescript
@Injectable()
export class CreateCabinetUseCase {
  constructor(
    private readonly cabinetsRepository: ICabinetsRepository,
    private readonly membersRepository: ICabinetMembersRepository,
  ) {}

  async execute(dto: CreateCabinetDto, userId: string): Promise<CabinetEntity> {
    // business logic here — no Prisma, no HTTP
    const cabinet = await this.cabinetsRepository.create({ ... });
    return cabinet;
  }
}
```

**Rules:**
- One class = one operation. Never combine multiple operations in a single use case.
- Throw NestJS exception classes (`NotFoundException`, `ConflictException`, `BadRequestException`, etc.) directly from use cases — they carry no HTTP coupling.
- Do not call repositories from controllers. Controllers call use cases; use cases call repositories.

---

## 4. Soft Deletes — Mandatory

Physical deletes are **forbidden** (except in `admin` module where explicitly documented). Every query that reads data must filter `disabledAt: null`:

```typescript
// correct
await this.prisma.cabinet.findFirst({ where: { slug, disabledAt: null } });

// wrong — returns soft-deleted records
await this.prisma.cabinet.findFirst({ where: { slug } });
```

Soft-delete operations set the field: `await this.prisma.cabinet.update({ where: { id }, data: { disabledAt: new Date() } })`.

---

## 5. Database Error Handling

Catch Prisma unique constraint violations at the **repository layer** and re-throw as domain exceptions. Do not let raw Prisma errors surface to controllers.

The global `DatabaseExceptionFilter` maps remaining Prisma error codes to HTTP responses:

| Prisma Code | HTTP Status |
|---|---|
| `P2002` | 409 Conflict |
| `P2025` | 404 Not Found |

For `P2002` errors that require a custom message, catch and rethrow in the repository:

```typescript
try {
  return await this.prisma.cabinet.create({ data });
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException('Cabinet with this slug already exists');
  }
  throw e;
}
```

---

## 6. Controllers & Swagger

Every controller endpoint must have:
- `@ApiTags('domain-name')` on the class
- `@ApiOperation({ summary: '...' })` on every method
- `@ApiResponse({ status: ..., type: ... })` for the primary success response
- `@ApiBearerAuth()` on protected endpoints

```typescript
@ApiTags('cabinets')
@Controller('cabinets')
export class CabinetsController {
  @Get(':slug')
  @ApiOperation({ summary: 'Get cabinet by slug' })
  @ApiResponse({ status: 200, type: CabinetResponseDto })
  @ApiResponse({ status: 404, description: 'Cabinet not found' })
  async findBySlug(@Param('slug') slug: string): Promise<CabinetResponseDto> {
    return this.findCabinetBySlugUseCase.execute(slug);
  }
}
```

**Controllers must not contain business logic.** Validate input via DTOs + `ValidationPipe`, then delegate immediately to the use case.

---

## 7. Guards & Decorators

| Guard | Decorator | What it enforces |
|---|---|---|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | Valid JWT access token required |
| `OptionalJwtAuthGuard` | `@UseGuards(OptionalJwtAuthGuard)` | Populates user if token present; does not block |
| `RolesGuard` | `@Roles(UserRole.ADMIN)` | Platform-level role check |
| `CabinetRolesGuard` | `@CabinetRoles(CabinetRole.OWNER)` | Role within a specific cabinet |
| `UserAccessGuard` | `@UseGuards(UserAccessGuard)` | Resource ownership for user-scoped routes |
| `DemandAccessGuard` | `@UseGuards(DemandAccessGuard)` | Demand owner or cabinet staff |
| `ResultAccessGuard` | `@UseGuards(ResultAccessGuard)` | Result access |

Access the authenticated user in a controller via `@CurrentUser() user: UserEntity`.

---

## 8. Event-Driven Communication

Use `EventEmitter2` (`@nestjs/event-emitter`) for cross-module side effects that must not create circular dependencies.

**Emitting:**
```typescript
this.eventEmitter.emit('demand.created', { userId, demandId });
```

**Listening** (in `application/`):
```typescript
@Injectable()
export class DemandEmailListener {
  @OnEvent('demand.created')
  async handle({ demandId }: { demandId: string }): Promise<void> {
    // send email, update counters, etc.
  }
}
```

Register listeners in the module's `providers` array. Listeners must follow the same import constraints as use cases — no Prisma, only repository interfaces.

---

## 9. Async Jobs — BullMQ

Long-running or deferred work (e.g., linking guest demands after registration) goes through `QueueService`. Never perform these operations synchronously in the request cycle.

```typescript
await this.queueService.add('link-guest-demands', { email, userId });
```

Queue processors live in `infrastructure/` and may use `PrismaService` directly.

---

## 10. File Storage

Always persist both `storageKey` (S3 object key — needed for programmatic deletion) and `url` (public access URL) alongside `mimeType` and `size`. Validate file type by magic bytes, not MIME type header.

Upload flow:
1. Controller requests presigned URL from `StorageService`.
2. Client uploads directly to S3.
3. Client calls the confirm endpoint.
4. Use case persists `storageKey`, `url`, `mimeType`, `size` to the database.

---

## 11. Pagination

All list endpoints return a `PaginatedResult<T>`:

```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

Use `PaginationHelper.getSkipTake(params)` inside repositories to derive `skip` and `take` from `page`/`limit`. Expose pagination params via `PaginationQueryDto` on list endpoint query params.

---

## 12. Testing

Unit tests live in `application/` alongside the use case they test, named `*.spec.ts`. Tests must **not** instantiate `PrismaService`. Mock every repository using `jest.fn()` shaped to the abstract class contract:

```typescript
const module = await Test.createTestingModule({
  providers: [
    CreateCabinetUseCase,
    {
      provide: ICabinetsRepository,
      useValue: {
        create: jest.fn(),
        findSlugsByBaseName: jest.fn(),
      },
    },
  ],
}).compile();
```

Test only the use-case behaviour — inputs, outputs, thrown exceptions, and emitted events. Do not test private methods or repository internals.

---

## 13. Environment Variables

All required variables must be defined in `.env` and documented in `.env.example` with placeholder values. Never commit real secrets.

Key variables:

```bash
DATABASE_URL="postgresql://admin:admin@localhost:5432/gabinete?schema=public"
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
RESEND_API_KEY=
REDIS_URL=
FRONTEND_URL=
```

Access configuration through `ConfigService` from `@nestjs/config`. Never read `process.env` directly inside modules.

---

## 14. Schema & Migration Rules

Any modification to the Prisma schema or core business logic must be appended to the `CHANGELOG` section in `architecture.md` with: date, what changed, and why.

Migration workflow:

```bash
npx prisma migrate dev    # create + apply a new migration
npx prisma generate       # regenerate the Prisma client after schema changes
```

Never modify an existing migration file. Always create a new migration.

---

## Quick Reference — What Goes Where

| What | Where |
|---|---|
| Plain domain entities | `src/modules/<module>/domain/*.entity.ts` |
| Enums | `src/modules/<module>/domain/*.enum.ts` |
| Repository contracts | `src/modules/<module>/domain/*.repository.interface.ts` |
| Use cases | `src/modules/<module>/application/*.use-case.ts` |
| Event listeners | `src/modules/<module>/application/*.listener.ts` |
| Unit tests | `src/modules/<module>/application/*.spec.ts` |
| Input/output DTOs | `src/modules/<module>/dto/*.dto.ts` |
| Prisma repositories | `src/modules/<module>/infrastructure/*.repository.ts` |
| HTTP controllers | `src/modules/<module>/infrastructure/*.controller.ts` |
| NestJS module | `src/modules/<module>/infrastructure/*.module.ts` |
| Shared guards | `src/shared/guards/` |
| Shared decorators | `src/shared/decorators/` |
| Global exception filters | `src/shared/filters/` |
| Reusable infrastructure services | `src/shared/infrastructure/services/` |
| Mail service | `src/shared/mail/` |
| Pure utility functions | `src/shared/utils/` |
