# Barbershop Management API — Development Roadmap

## Context

The repo is a NestJS scaffold: the Prisma schema is already fully modeled and migrated to match `spec-en.md` §3 (11 models, 7 enums, migration `20260816041157_init_barbershop_database` applied), and a handful of shared building blocks exist (`PrismaService`/`PrismaModule`, `DatabaseExceptionFilter`, `PaginationHelper`, `BcryptService`). But **zero feature modules exist** — `src/modules/` doesn't exist yet, and two files that will anchor the whole auth system (`src/shared/decorators/current-user.decorator.ts`, `roles.decorator.ts`) already import from a `users` module that hasn't been built, so the project doesn't currently compile cleanly end-to-end.

This plan sequences the build of every feature module described in `spec-en.md`, in an order that respects real dependencies (auth needs users, appointments need barbers+services+working-hours, loyalty needs appointments), introduces cross-cutting infra (email, storage, events) exactly where the spec first needs them, and calls out the concurrency-sensitive rules (double-booking prevention, atomic loyalty updates) at the point they must be implemented correctly.

Six decisions were resolved with the user before finalizing this plan:
1. **Commission tracking**: not a read-time computation (rejected — `Barber.commissionPercentage` changes over time, so recomputing from the current rate would silently rewrite historical reports). Instead, add two **snapshot fields to the existing `AppointmentService` model** at appointment-completion time: `commissionPercentageApplied` (Decimal 5,2) and `commissionAmount` (Int, cents). This is a schema change (new migration + CHANGELOG entry) but reuses the existing snapshot pattern already used for `serviceName`/`price`/`durationMinutes` — no new table. It also resolves spec §4.3/§6's open question implicitly: a points-redeemed service just gets `commissionAmount = 0` (explicit, not inferred from a separate flag) if `Setting['commission_on_redeemed_service']` is false, or the full computed amount if true.
2. **Loyalty atomicity**: `complete-appointment.use-case.ts` injects `ILoyaltyRepository` directly and performs the status change + loyalty ledger write inside one `$transaction`, guaranteeing the atomicity spec §4.6 requires. `EventEmitter2` (`appointment.completed`) is still emitted afterward, but only for non-critical side effects (notifications, cache invalidation) — never for anything that must be atomic with completion.
3. **Barber-invite pending state**: `User.disabledAt` stays exclusively a soft-delete field. A barber created via invite (where no existing account matched the email) is an active `User` row from the start (no `passwordHash`, can't log in); "pending" is inferred purely from `BarberInvite.acceptedAt IS NULL`.
4. **WhatsApp integration scope**: this repo only exposes `ServiceApiKeyGuard`-protected routes on the existing `appointments`/`users` controllers, reusing the same use cases platform bookings use. No chatbot, NLP, or WhatsApp-client code belongs in this repo — that's a separate external service.
5. **Existing-user barber promotion**: `Barber` is a hard 1:1 extension of `User` (single `role` field, no multi-role) — there's no such thing as a "barber with no user." So `send-invite.use-case.ts` first looks up the invited email via `IUsersRepository.findByEmail`. Not found → behaves as decision #3 describes (new `User`, `role: BARBER`, no password). Found with `role: CUSTOMER` → reuses that `userId` for the `BarberInvite` and leaves `role` untouched until acceptance (so an unaccepted invite doesn't silently reclassify an active customer). Found with `role: BARBER` or `OWNER` → `ConflictException`. `accept-invite.use-case.ts` always sets `role: BARBER` on acceptance regardless of path, and only runs the "set password" step when the user doesn't already have a `passwordHash` — an existing customer keeps their current password.
6. **No queue infra yet**: `send-invite.use-case.ts`/`resend-invite.use-case.ts` call `MailService` directly and `await` the send inline in the request cycle — no `QueueService`/BullMQ. The `bullmq`/`ioredis`/`@nestjs/bullmq` packages are dropped from the Phase 0 install list; queue infrastructure is deferred until a phase actually needs true background/deferred work (none currently does — an invite email is a single Resend API call, acceptable to await inline).

---

## Phase 0 — Foundation / unblocking

Get the project to a clean, compilable, testable baseline before any feature module exists.

- `npm install` the packages architecture.md requires but `package.json` is missing:
  - Auth: `@nestjs/passport passport passport-jwt passport-google-oauth20 @nestjs/jwt` (+ `@types/passport-jwt @types/passport-google-oauth20` as dev deps)
  - Storage: `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
  - Email: `resend`
  - Events: `@nestjs/event-emitter`
- Create `.env.example` mirroring `.env`'s keys with placeholder values (architecture.md §13 requires this; it doesn't exist). Add `BCRYPT_SALT_ROUNDS` (already read by `bcrypt.service.ts`). Drop `SMS_PROVIDER_API_KEY` unless the user says otherwise — it has no home in `spec-en.md` or `architecture.md`.
- Add a `## CHANGELOG` section to `architecture.md` (§14 mandates it; missing today). Seed it with the initial migration, then immediately append the Phase 8 `AppointmentService` commission-fields migration once that lands.
- Fix the stale `test/app.e2e-spec.ts` (expects `GET /` → `"Hello World!"`, but `AppModule` has no controllers and never will at root). Replace with a minimal `HealthController` in `src/shared/` + matching e2e spec, so e2e scaffolding stays alive without waiting for a real feature module.

No feature-module code yet.

---

## Phase 1 — `users` module

Unblocks the two broken decorator imports: `src/shared/decorators/current-user.decorator.ts` needs `src/modules/users/domain/user.entity.ts`, and `roles.decorator.ts` needs `src/modules/users/domain/user-role.enum.ts`. Building these first, at those exact paths, is this phase's first job.

- **domain/**: `user.entity.ts` (id, name, email, phone, passwordHash, role, loyaltyPoints, avatarUrl, avatarStorageKey, createdAt, disabledAt — plain property bag), `user-role.enum.ts` (`OWNER`/`BARBER`/`CUSTOMER`, mirrors Prisma `UserRole`), `users.repository.interface.ts` (`abstract class IUsersRepository`: `findById`, `findByEmail`, `create`, `update`, `softDelete` — all reads filter `disabledAt: null`).
- **application/**: `create-user.use-case.ts` (internal, consumed by auth/invite flows), `get-user-profile.use-case.ts`, `update-user-profile.use-case.ts`.
- **dto/**: `update-profile.dto.ts`, `user-response.dto.ts`.
- **infrastructure/**: `users.repository.ts` (Prisma impl + private `toEntity()`), `users.controller.ts` (`GET /users/me`, `PATCH /users/me` — unguarded stub until Phase 2 wires `JwtAuthGuard` in), `users.module.ts`.
- Avatar upload deferred to Phase 7 (needs `StorageService`).
- Unit tests per use case, mocking `IUsersRepository`.

---

## Phase 2 — `auth` module (JWT + Google OAuth + sessions)

- **`src/shared/guards/`** introduced: `jwt-auth.guard.ts`, `optional-jwt-auth.guard.ts`, `roles.guard.ts` (consumes existing `roles.decorator.ts`).
- **domain/**: `session.entity.ts`, `account.entity.ts`, `sessions.repository.interface.ts`, `accounts.repository.interface.ts`.
- **application/**: `register-local.use-case.ts` (hashes via `BcryptService`), `login-local.use-case.ts`, `login-google.use-case.ts` (upserts `Account` keyed by provider+providerAccountId, links to existing `User` by email or creates one), `refresh-token.use-case.ts` (rotates `Session.refreshTokenHash` — issue new + invalidate old on every use), `logout.use-case.ts`.
- Design point: `Session` (with `userAgent`/`ipAddress`) models per-device refresh-token rotation — access tokens are short-lived JWTs (never persisted), refresh tokens are opaque + hashed per session row, so both single-device and all-device logout are possible.
- **infrastructure/**: `jwt.strategy.ts` (payload: `sub`, `role`, `barberId?` per spec §2), `google.strategy.ts`, `auth.controller.ts` (`POST /auth/register`, `POST /auth/login`, `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/refresh`, `POST /auth/logout`), `auth.module.ts` (`JwtModule.register` with `JWT_SECRET`).
- **dto/**: `register.dto.ts`, `login.dto.ts`, `auth-response.dto.ts`.
- Retrofit `JwtAuthGuard` + `RolesGuard`/`@Roles()` onto Phase 1's `users.controller.ts`.
- Tests: use-case units; first real e2e (register → login → refresh) replacing Phase 0's health-only e2e.

---

## Phase 3 — `barbers` + `settings` modules

- **`settings` module** (small, built now because Phases 4/9 both need it): `domain/setting.entity.ts`, `settings.repository.interface.ts` (`getByKey`, `upsert`); `application/get-setting.use-case.ts`; `infrastructure/settings.repository.ts`, `settings.module.ts` (no controller needed yet unless OWNER admin UI requires one — internal consumption only for now).
- **domain/**: `barber.entity.ts`, `barbers.repository.interface.ts` (`findById`, `findByUserId`, `list` paginated, `updateCommission`, `disabledAt: null` filtered).
- **application/**: `list-barbers.use-case.ts` (customer-visible, for booking), `get-barber.use-case.ts`, `update-commission.use-case.ts` (OWNER-only, enforced via `@Roles(UserRole.OWNER)` at the controller).
- **New Setting key**: `default_commission_percentage` (read by Phase 4's invite-accept flow when creating a `Barber` row).
- **dto/**: `barber-response.dto.ts`, `update-commission.dto.ts`.
- **infrastructure/**: `barbers.repository.ts`, `barbers.controller.ts` (`GET /barbers`, `GET /barbers/:id`, `PATCH /barbers/:id/commission` per spec §5), `barbers.module.ts`.

---

## Phase 4 — `barber-invites` module (email introduced)

- **`src/shared/mail/`**: `mail.service.ts` (abstract `IMailService`, DI token) + `resend-mail.service.ts` (uses `RESEND_API_KEY`/`RESEND_FROM_EMAIL`). Injected directly into use cases — no queue indirection (decision #6); this mirrors how `BcryptService` is already injected straight into `application/` use cases elsewhere.
- **domain/**: `barber-invite.entity.ts`, `barber-invites.repository.interface.ts` (`create`, `findByUserId`, `findByTokenHash`, `markAccepted`).
- **application/**:
  - `send-invite.use-case.ts` (OWNER-only). Looks up the invited email via `IUsersRepository.findByEmail` first (decision #5): not found → creates a new *active* `User` with `role: BARBER`, no `passwordHash` (decision #3); found with `role: CUSTOMER` → reuses that `userId` for the invite without touching `role` yet; found with `role: BARBER`/`OWNER` → throws `ConflictException`. Generates a plaintext token, persists only `tokenHash`; `expiresAt` = now + `Setting['barber_invite_expiry_days']` default 7; sends the invite email by calling `MailService` directly, awaited in the request cycle.
  - `validate-invite-token.use-case.ts` (public).
  - `accept-invite.use-case.ts` (verifies token hash + not expired + `acceptedAt IS NULL`; sets `role: BARBER` unconditionally — covers both the brand-new-user and promoted-existing-customer paths; sets a password via `BcryptService` only if the user doesn't already have one, decision #5; creates `Barber` row with `commissionPercentage` = `Setting['default_commission_percentage']`; sets `acceptedAt`).
  - `resend-invite.use-case.ts` (OWNER-only: regenerates `tokenHash` + `expiresAt`, resends the email directly via `MailService`).
- **dto/**: `send-invite.dto.ts` (`name`, `email` — `name` is only used when no existing user is found), `accept-invite.dto.ts` (`password` optional — omitted by the client when the invited user already has one; the use case ignores it if present but unneeded).
- **infrastructure/**: `barber-invites.repository.ts`, `barber-invites.controller.ts` (exact routes from spec §5: `POST /invites`, `GET /invites/:token`, `POST /invites/:token/accept`, `POST /invites/:id/resend`), `barber-invites.module.ts`.
- Good phase for an e2e spanning users+auth+barbers+invites (full invite→accept→login lifecycle for a brand-new barber), plus a second e2e covering the existing-customer promotion path (register as `CUSTOMER` → OWNER invites the same email → accept without a password → `role` is now `BARBER` and the original password still logs in).

---

## Phase 5 — `services` module (service catalog)

Independent of appointments but required before Phase 8 (appointments snapshot `Service` data).

- **domain/**: `service.entity.ts`, `services.repository.interface.ts` (`create`, `update`, `list` paginated + status filter, `softDelete`, `findById`).
- **application/**: `create-service.use-case.ts`, `update-service.use-case.ts`, `list-services.use-case.ts` (non-OWNER callers see only `ACTIVE`), `deactivate-service.use-case.ts` (sets `status: INACTIVE`, distinct from soft delete).
- **dto/**: `create-service.dto.ts`, `update-service.dto.ts`, `service-response.dto.ts`.
- **infrastructure/**: `services.repository.ts`, `services.controller.ts` (`POST/PATCH/DELETE` OWNER via existing `@Roles`/`RolesGuard`; `GET` any authenticated user), `services.module.ts`.

---

## Phase 6 — `working-hours` module

- **domain/**: `barber-working-hours.entity.ts`, `working-hours.repository.interface.ts` (`listByBarber`, `create`, `update`, `softDelete`).
- **application/**: `set-weekly-hours.use-case.ts`, `set-date-exception.use-case.ts`, `get-availability-window.use-case.ts` — resolves the effective working window for a barber+date by applying `SPECIFIC_DATE` override if present else `WEEKLY` (per spec §3.5/§4.4). This is pure logic, exported for Phase 8's slot calculation to call directly.
- **dto/**: `set-weekly-hours.dto.ts`, `set-date-exception.dto.ts`, `working-hours-response.dto.ts`.
- **infrastructure/**: `working-hours.repository.ts`, `working-hours.controller.ts` (BARBER manages own via an inline ownership check in the use case — `if (user.role !== OWNER && user.barberId !== target.barberId) throw ForbiddenException` — kept inline rather than a new guard, to avoid a premature abstraction before Phase 8's real `AppointmentOwnershipGuard` exists), `working-hours.module.ts`.
- Priority test target: `get-availability-window.use-case.spec.ts` needs thorough exception-priority and day-boundary coverage, since Phase 8 depends on its correctness.

---

## Phase 7 — Storage (`StorageService`) + avatar upload

- **`src/shared/infrastructure/services/`**: `storage.service.ts` (presigned-URL + confirm contract per architecture.md §10), `s3-storage.service.ts` (AWS SDK v3 against the R2/S3 endpoint).
- **`src/shared/validators/magic-bytes.validator.ts`**: custom class-validator, validates by magic bytes not MIME header.
- Extends Phase 1's `users` module: `request-avatar-upload.use-case.ts` + `confirm-avatar-upload.use-case.ts`, `POST /users/me/avatar/upload-url` + `POST /users/me/avatar/confirm`. Persists `avatarUrl`/`avatarStorageKey` on `User` (schema doesn't carry `mimeType`/`size` for avatars specifically — transient only, consistent with the existing model).
- No new guards; reuses `JwtAuthGuard`.

---

## Phase 8 — `appointments` module (core, concurrency-critical)

Depends on Phases 3, 5, 6. Includes the **schema change** decided above.

- **Schema change** (new migration, append CHANGELOG entry): add `commissionPercentageApplied Decimal @db.Decimal(5,2)` and `commissionAmount Int` to `AppointmentService`, both nullable until an appointment item is completed.
- **`src/shared/guards/`**: `appointment-ownership.guard.ts` (verifies `barberId` on the target appointment matches the authenticated barber for writes; OWNER bypasses), `service-api-key.guard.ts` (generic service-to-service auth, reused by Phase 10).
- **domain/**: `appointment.entity.ts`, `appointment-service.entity.ts` (snapshot entity, now including the commission fields), `appointments.repository.interface.ts` — key method `createWithConflictCheck(data): Promise<AppointmentEntity>` that internally wraps the conflict re-check + insert in one `$transaction` and throws `ConflictException` on overlap; scoped read methods (`findByIdScoped(id, requester)`) so spec §2's automatic barberId/customerId query scoping is enforced at the repository boundary, not just the guard.
- **application/**:
  - `get-available-slots.use-case.ts` — combines Phase 6's availability window with existing `PENDING`/`CONFIRMED` appointments and the sum of requested `Service.durationMinutes` to produce dynamic (non-fixed-grid) slots.
  - `create-appointment.use-case.ts` — thin orchestration calling `createWithConflictCheck`; all transaction mechanics live in `infrastructure/appointments.repository.ts` (use cases can't import `@prisma/client`).
  - `confirm-appointment.use-case.ts`, `cancel-appointment.use-case.ts` (records `cancellationReason`/`cancelledBy`/`cancelledAt`), `mark-no-show.use-case.ts`.
  - `complete-appointment.use-case.ts` — **the atomicity-critical one**, implementing decision #2: in a single `$transaction`, sets `status: COMPLETED`, computes and persists `commissionPercentageApplied`/`commissionAmount` per `AppointmentService` row (0 if `redeemedWithPoints` and `Setting['commission_on_redeemed_service']` is false), and — via an injected `ILoyaltyRepository` — writes the `LoyaltyTransaction` + updates `User.loyaltyPoints` for earned/redeemed points. Emits `appointment.completed` afterward for non-critical side effects only.
- **dto/**: `create-appointment.dto.ts` (barberId, serviceIds[], startsAt), `available-slots-query.dto.ts`, `appointment-response.dto.ts`, `cancel-appointment.dto.ts`, `complete-appointment.dto.ts` (which `AppointmentService` items are `redeemedWithPoints`, decided by the barber at completion time).
- **infrastructure/**: `appointments.repository.ts`, `appointments.controller.ts` (`POST /appointments`, `GET /appointments`, `GET /appointments/:id`, `PATCH /appointments/:id/confirm`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/complete`, `GET /appointments/available-slots`), `appointments.module.ts`.
- Tests: conflict-detection edge cases (adjacent-not-overlapping, exact-boundary), plus a **real-Postgres concurrency test** (concurrent `POST /appointments` against the same barber/window) — explicitly not mockable, called out as an exception to the "no PrismaService in tests" rule.

---

## Phase 9 — `loyalty` module + commission reporting

- **domain/**: `loyalty-transaction.entity.ts`, `loyalty.repository.interface.ts` (`createTransaction`, `getBalance`, `listByCustomer` paginated) — this is the `ILoyaltyRepository` Phase 8 injects.
- **application/**: `get-loyalty-balance.use-case.ts`, `list-loyalty-transactions.use-case.ts`, `get-barber-commission-report.use-case.ts` (aggregates the new `commissionAmount` snapshot fields from completed `AppointmentService` rows — no extra computation needed at read time now that Phase 8 froze the values).
- **New Setting key**: `commission_on_redeemed_service` (boolean, read by Phase 8's completion logic).
- **dto/**: `loyalty-balance-response.dto.ts`, `loyalty-transaction-response.dto.ts`, `commission-report-response.dto.ts`.
- **infrastructure/**: `loyalty.repository.ts`, `loyalty.controller.ts` (`GET /loyalty/me` CUSTOMER, `GET /loyalty/customers/:id` OWNER), commission report endpoint folded into `barbers.controller.ts` (`GET /barbers/:id/commission-report`, BARBER-own or OWNER), `loyalty.module.ts`.
- Tests: assert the mocked repository's atomic-write method is called exactly once with both ledger + balance changes bundled (validates Phase 8's transaction shape from the loyalty side).

---

## Phase 10 — WhatsApp-facing endpoints (scope-limited)

Per decision #4: no dedicated `whatsapp-integration` module.

- `find-or-create-customer-by-phone.use-case.ts` added to the **`users` module** (auto-creates a `CUSTOMER` with no `passwordHash`).
- Reuse Phase 8's `create-appointment.use-case.ts` and `get-available-slots.use-case.ts` unchanged.
- Add `ServiceApiKeyGuard`-protected routes (e.g. `POST /whatsapp/appointments`, `GET /whatsapp/available-slots`, `POST /whatsapp/customers`) as thin controller additions inside the existing `appointments`/`users` modules, delegating to the same use cases platform bookings use.

---

## Cross-cutting introduction points

| Concern | Phase | Where |
|---|---|---|
| `JwtAuthGuard`/`RolesGuard` | 2 | `src/shared/guards/` |
| Resend / `MailService` | 4 | `src/shared/mail/` |
| S3/R2 `StorageService` | 7 | `src/shared/infrastructure/services/` |
| `AppointmentOwnershipGuard` / `ServiceApiKeyGuard` | 8 | `src/shared/guards/` |
| `$transaction` conflict-check | 8 | `appointments.repository.ts` |
| Commission snapshot fields (schema change) | 8 | `AppointmentService` migration |
| `EventEmitter2` | 8 | `appointment.completed`, non-critical listeners only |
| Atomic loyalty transaction | 8 | `complete-appointment.use-case.ts` + `ILoyaltyRepository` |

---

## Verification

- After each phase: `npm run build` (compiler enforces layer import boundaries indirectly via TS path errors if a domain/application file accidentally imports Nest/Prisma), `npm run lint`, `npm run test` (colocated `*.spec.ts` per use case).
- Phase 0: `npm run test:e2e` passes against the health-check controller.
- Phase 2: e2e register → login → refresh → logout flow.
- Phase 4: e2e invite → accept → login flow.
- Phase 8: unit tests for slot/conflict edge cases via `npm run test`, plus a dedicated concurrency test hitting a real local Postgres (via `docker-compose.yml`, already present) with concurrent booking requests to prove no double-booking — run manually or as a tagged e2e suite, not part of the mocked-repository unit tests.
- Manual smoke test via Swagger UI (`@nestjs/swagger` already installed) at each phase's controller additions — confirm `@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiBearerAuth` render correctly and guards actually block unauthenticated/wrong-role requests.
- After Phase 8's schema change: confirm `architecture.md`'s CHANGELOG section has a new entry (date, what changed — `AppointmentService.commissionPercentageApplied`/`commissionAmount` added — and why — frozen historical commission accuracy independent of later `Barber.commissionPercentage` edits).
