# Barbershop Management API — Development Roadmap

## Context

The repo is a NestJS scaffold: the Prisma schema is already fully modeled and migrated to match `spec-en.md` §3 (11 models, 7 enums, migration `20260816041157_init_barbershop_database` applied), and a handful of shared building blocks exist (`PrismaService`/`PrismaModule`, `DatabaseExceptionFilter`, `PaginationHelper`, `BcryptService`). But **zero feature modules exist** — `src/modules/` doesn't exist yet, and two files that will anchor the whole auth system (`src/shared/decorators/current-user.decorator.ts`, `roles.decorator.ts`) already import from a `users` module that hasn't been built, so the project doesn't currently compile cleanly end-to-end.

This plan sequences the build of every feature module described in `spec-en.md`, in an order that respects real dependencies (auth needs users, appointments need barbers+services+working-hours, loyalty needs appointments), introduces cross-cutting infra (email, storage, events) exactly where the spec first needs them, and calls out the concurrency-sensitive rules (double-booking prevention, atomic loyalty updates) at the point they must be implemented correctly.

Six decisions were resolved with the user before finalizing this plan:
1. **Commission tracking**: not a read-time computation (rejected — `Barber.commissionPercentage` changes over time, so recomputing from the current rate would silently rewrite historical reports). Instead, add two **snapshot fields to the existing `AppointmentService` model** at appointment-completion time: `commissionPercentageApplied` (Decimal 5,2) and `commissionAmount` (Int, cents). This is a schema change (new migration + CHANGELOG entry) but reuses the existing snapshot pattern already used for `serviceName`/`price`/`durationMinutes` — no new table. It also resolves spec §4.3/§6's open question implicitly: a points-redeemed service just gets `commissionAmount = 0` (explicit, not inferred from a separate flag) if `Setting['commission_on_redeemed_service']` is false, or the full computed amount if true.
2. **Loyalty atomicity**: revised while building Phase 8 from the original text below. `complete-appointment.use-case.ts` does **not** inject an `ILoyaltyRepository` — the `loyalty` module doesn't exist yet at this point in the sequence (it's Phase 9), and per the pattern already established in Phase 5 (`ServicesRepository.create()` writing `Service` + `BarberService` together) and Phase 5.5, a multi-model Prisma `$transaction` has to live entirely inside one repository method, since a use case can't hold open a `tx` client across two injected repositories. So `IAppointmentsRepository.complete()` (in `appointments.repository.ts`) does the whole thing itself: status → `COMPLETED`, per-item `commissionPercentageApplied`/`commissionAmount`, and directly writes `LoyaltyTransaction` + increments/decrements `User.loyaltyPoints` — all inside one `$transaction`, guaranteeing the atomicity spec §4.6 requires. `complete-appointment.use-case.ts` stays a thin orchestrator: read the `commission_on_redeemed_service` setting, call `repository.complete(...)`, then emit `EventEmitter2`'s `appointment.completed` afterward for non-critical side effects only (notifications, cache invalidation — nothing that must be atomic with completion). When Phase 9 builds the real `loyalty` module, its `ILoyaltyRepository`/repository implementation is for the *read* side (`getBalance`, `listByCustomer`) — it talks to the same `loyalty_transactions` table this method already writes to, but Phase 8 doesn't depend on it.
   - **Redemption cost gap**: `AppointmentService` snapshots `pointsEarned` at booking time (per spec §3.7) but has no `pointsRequired` snapshot — so when an item is completed with `redeemedWithPoints: true`, the points debited are read from the **current** `Service.pointsRequired` at completion time, not a frozen booking-time value (unlike price/duration, which *are* frozen). This is a pre-existing schema gap, not something this phase's plan called out to fix; flagging it here rather than silently deciding it.
   - **Redeemed items don't also earn points**: an item marked `redeemedWithPoints: true` is treated as a `REDEEM` transaction only — it does not also credit `pointsEarned`, even though the `AppointmentService` row may have a nonzero `pointsEarned` snapshot. This prevents a free redemption from also generating new points toward the next redemption.
   - **Balance check**: `complete()` fetches the customer's current `User.loyaltyPoints` inside the transaction and tracks a running balance as it processes each item, throwing `BadRequestException` before any write if a redemption would take the balance negative — the spec doesn't say who's responsible for verifying sufficient balance at redemption time, so this phase makes it authoritative here rather than trusting the client.
   - **`create-appointment` also validates working hours**: beyond what the plan text below says, `create-appointment.use-case.ts` calls Phase 6's `GetAvailabilityWindowUseCase` and rejects (`ConflictException`) a request whose `[startsAt, endsAt)` falls outside the barber's resolved working window for that date — not just the double-booking check. Without this, a client could book a slot the `available-slots` endpoint would never have offered. `createWithConflictCheck` still owns the concurrency-safe double-booking check inside its own `$transaction`.
   - **The double-booking check needs `SERIALIZABLE`, not just a `$transaction`**: a first pass wrapped the re-check `findFirst` + `create` in a plain (default `READ COMMITTED`) Prisma `$transaction` — that does *not* actually prevent the race it exists to prevent, since two concurrent transactions can both read "no conflict" before either commits its insert (classic check-then-insert race, unaffected by READ COMMITTED). `createWithConflictCheck` runs at `Prisma.TransactionIsolationLevel.Serializable` instead, so Postgres itself detects the read/write conflict between two concurrent overlapping bookings and aborts the loser with a `P2034` ("write conflict or deadlock") error, which the repository catches and rethrows as the same `ConflictException` the plain overlap check throws — the client can't tell which path fired, both mean "someone else got there first." This is exactly the scenario the plan's real-Postgres concurrency test exists to catch, and it did catch it during development.

   Original pre-Phase-8 text (kept for history): "`complete-appointment.use-case.ts` injects `ILoyaltyRepository` directly and performs the status change + loyalty ledger write inside one `$transaction`, guaranteeing the atomicity spec §4.6 requires. `EventEmitter2` (`appointment.completed`) is still emitted afterward, but only for non-critical side effects (notifications, cache invalidation) — never for anything that must be atomic with completion."
3. **Barber-invite pending state**: `User.disabledAt` stays exclusively a soft-delete field. A barber created via invite (where no existing account matched the email) is an active `User` row from the start (no `passwordHash`, can't log in); "pending" is inferred purely from `BarberInvite.acceptedAt IS NULL`.
4. **WhatsApp integration scope**: this repo only exposes `ServiceApiKeyGuard`-protected routes on the existing `appointments`/`users` controllers, reusing the same use cases platform bookings use. No chatbot, NLP, or WhatsApp-client code belongs in this repo — that's a separate external service.
5. **Existing-user barber promotion**: `Barber` is a hard 1:1 extension of `User` (single `role` field, no multi-role) — there's no such thing as a "barber with no user." So `send-invite.use-case.ts` first looks up the invited email via `IUsersRepository.findByEmail`. Not found → behaves as decision #3 describes (new `User`, `role: BARBER`, no password). Found with `role: CUSTOMER` → reuses that `userId` for the `BarberInvite` and leaves `role` untouched until acceptance (so an unaccepted invite doesn't silently reclassify an active customer). Found with `role: BARBER` or `OWNER` → `ConflictException`. `accept-invite.use-case.ts` always sets `role: BARBER` on acceptance regardless of path, and only runs the "set password" step when the user doesn't already have a `passwordHash` — an existing customer keeps their current password.
6. **No queue infra yet**: `send-invite.use-case.ts`/`resend-invite.use-case.ts` call `MailService` directly and `await` the send inline in the request cycle — no `QueueService`/BullMQ. The `bullmq`/`ioredis`/`@nestjs/bullmq` packages are dropped from the Phase 0 install list; queue infrastructure is deferred until a phase actually needs true background/deferred work (none currently does — an invite email is a single Resend API call, acceptable to await inline).
7. **Barber↔service capability** (added after Phase 5, not in the original six): `spec-en.md` never models which services a given barber can perform — the catalog (`Service`) is barbershop-wide and commission is a flat per-barber percentage (§3.2/§4.3), with no mention of a capability restriction anywhere in §3–§6. Rather than assume every barber can perform every service (which Phase 8's booking flow would otherwise silently do), add an explicit `BarberService` join table (new migration + CHANGELOG entry, built in the new **Phase 5.5**). Resolved with the user: (a) enforcement is a **hard block** — `get-available-slots`/`create-appointment` in Phase 8 reject any requested `serviceId` not assigned to the chosen barber; (b) a newly created `Barber` starts with **zero** assigned services (explicit opt-in, not "all active services by default") — `accept-invite.use-case.ts` from Phase 4 is unaffected, assignment happens afterward; (c) only `OWNER` manages assignments, matching the existing commission/catalog-management pattern; (d) unlike every other delete in this codebase, unassigning a service from a barber is a **physical delete** of the join row, not a soft delete — `BarberService` is a pure current-state relation with no standalone business history to preserve (unlike `User`/`Service`/`Appointment`), so the "soft deletes mandatory" rule doesn't apply to it. This is a deliberate, documented exception, not an oversight.

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
- **Added after Phase 5.5**: `POST /services` accepts an optional `barberIds: string[]`, letting the `OWNER` assign every capable barber in the same call that creates the service — a convenience for the common case of "this service, these barbers do it" instead of a mandatory create-then-assign-N-times sequence. Implemented entirely inside `services.repository.ts`'s `create()` (wraps `service.create` + `barberService.createMany` — deduped, empty array treated as none — in one `$transaction`, catches Prisma `P2003` → `NotFoundException` if any `barberId` doesn't exist) rather than by having `ServicesModule` import `BarberServicesModule` — that direction would create a module cycle, since `BarberServicesModule` already imports `ServicesModule`. `barber-services.controller.ts`'s own assign/unassign/list endpoints are unaffected and remain the way to manage capability after creation.

---

## Phase 5.5 — `barber-services` module (barber↔service capability)

Per decision #7. Independent of `working-hours`, but must land before Phase 8, which enforces it.

- **Schema change** (new migration, append CHANGELOG entry): new `BarberService` model — `id`, `barberId` (FK → `Barber`), `serviceId` (FK → `Service`), `createdAt`, `@@unique([barberId, serviceId])`, `@@map("barber_services")`. Add the inverse relations (`barberServices BarberService[]`) on `Barber` and `Service`.
- **domain/**: `barber-service.entity.ts`; `barber-services.repository.interface.ts` (`abstract class IBarberServicesRepository`: `assign(barberId, serviceId)`, `unassign(barberId, serviceId)` — physical delete per decision #7d, `listByBarber(barberId): Promise<ServiceEntity[]>` joined against `Service` for display, `listServiceIdsByBarber(barberId): Promise<string[]>` — the fast-path method Phase 8 calls to validate a requested service set).
- **application/**:
  - `assign-service-to-barber.use-case.ts` (OWNER-only): validates the barber exists via `IBarbersRepository.findById` and the service exists via `IServicesRepository.findById`, then calls `repository.assign`; duplicate assignment (`P2002` at the repository layer) rethrown as `ConflictException`.
  - `unassign-service-from-barber.use-case.ts` (OWNER-only): calls `repository.unassign` — no-op-safe if the row doesn't exist (Prisma `P2025` mapped to `NotFoundException` at the repository layer, mirroring the global `DatabaseExceptionFilter` convention).
  - `list-barber-services.use-case.ts` (any authenticated user — customers need this to know what a barber offers before booking): returns `repository.listByBarber(barberId)`.
- **dto/**: `assign-service.dto.ts` (`serviceId: string`), reuses Phase 5's `ServiceResponseDto` for the list response (no new response DTO needed — a barber's assigned services *are* `Service` records, not a distinct snapshot).
- **infrastructure/**: `barber-services.repository.ts` (Prisma impl, imports `IBarbersRepository`-independent — talks to `prisma.barberService` directly), `barber-services.controller.ts` — routes nested under barbers, per REST convention: `GET /barbers/:barberId/services` (any authenticated user), `POST /barbers/:barberId/services` (OWNER, body `{ serviceId }`), `DELETE /barbers/:barberId/services/:serviceId` (OWNER); `barber-services.module.ts` imports `BarbersModule` + `ServicesModule` (for their exported repository interfaces) so the use cases can validate barber/service existence without duplicating lookup logic.
- Unit tests per use case, mocking `IBarberServicesRepository` (+ `IBarbersRepository`/`IServicesRepository` where existence is checked).

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

Depends on Phases 3, 5, 5.5, 6. Includes the **schema change** decided above.

- **Schema change** (new migration, append CHANGELOG entry): add `commissionPercentageApplied Decimal? @db.Decimal(5,2)` and `commissionAmount Int?` to `AppointmentService`, both nullable until an appointment item is completed.
- **`src/shared/guards/`**: `appointment-ownership.guard.ts` (verifies `barberId` on the target appointment matches the authenticated barber for writes; OWNER bypasses). Its file lives under `src/shared/guards/` per convention, but — unlike the stateless `JwtAuthGuard`/`RolesGuard` — it needs `IAppointmentsRepository` + `IBarbersRepository` injected, so it's registered as a `provider` inside `AppointmentsModule` rather than being usable with no module wiring. `service-api-key.guard.ts` is **deferred to Phase 10** — nothing in Phase 8 wires a route to it, and shipping an unused, untested guard now was worse than building it next to its first real consumer.
- **domain/**: `appointment.entity.ts`, `appointment-service.entity.ts` (snapshot entity, now including the commission fields), `appointments.repository.interface.ts` — key method `createWithConflictCheck(data): Promise<AppointmentEntity>` that internally wraps the conflict re-check + insert in one `$transaction` and throws `ConflictException` on overlap. Simplified from the original plan text below: no `findByIdScoped(id, requester)` repository method — instead `findById` is a plain unscoped lookup, and `get-appointment.use-case.ts`/`cancel-appointment.use-case.ts` do the scoping check themselves after fetching (same "fetch, then check" shape already used by `working-hours`'s ownership checks), throwing `NotFoundException` — not `ForbiddenException` — for a mismatch, per spec §2's "this even prevents leaking the existence of other users' resources." Also `slot-calculator.util.ts` — pure function computing duration-sized candidate start times across the gaps between a working window and existing busy intervals (the "dynamic, not a fixed 15/30 grid" requirement from spec §4.5: the grid *is* the requested service duration, not a hardcoded constant).
- **application/**:
  - `get-available-slots.use-case.ts` — first validates every requested `serviceId` is in `IBarberServicesRepository.listServiceIdsByBarber(barberId)` (decision #7a hard block; `BadRequestException` otherwise), then combines Phase 6's availability window with existing `PENDING`/`CONFIRMED` appointments and the sum of requested `Service.durationMinutes` to produce dynamic (non-fixed-grid) slots via `slot-calculator.util.ts`.
  - `create-appointment.use-case.ts` — same barber-capability check as above (decision #7a), plus (see decision #2's addendum) a working-hours check via Phase 6's `GetAvailabilityWindowUseCase`, before calling `createWithConflictCheck`; thin orchestration otherwise, all transaction mechanics live in `infrastructure/appointments.repository.ts` (use cases can't import `@prisma/client`).
  - `get-appointment.use-case.ts`, `list-appointments.use-case.ts` — spec §2's automatic `barberId`/`customerId` scoping, resolved here (not a repository-level "scoped" method): `CUSTOMER` filters by own `customerId`, `BARBER` resolves its own `Barber.id` via `IBarbersRepository.findByUserId` and filters by it (empty result if the requester has no `Barber` row), `OWNER` sees everything.
  - `confirm-appointment.use-case.ts`, `mark-no-show.use-case.ts` — simple status-transition guards (`PENDING`→`CONFIRMED`, `PENDING`/`CONFIRMED`→`NO_SHOW`); ownership already enforced by `AppointmentOwnershipGuard` at the controller, so these don't re-check it (same trust-the-guard convention `RolesGuard` already establishes elsewhere).
  - `cancel-appointment.use-case.ts` (records `cancellationReason`/`cancelledBy`/`cancelledAt`) — **not** behind `AppointmentOwnershipGuard`, because cancellation is available to the owning `CUSTOMER` too, not just `BARBER`/`OWNER`; does its own inline three-way check (`OWNER`, or `requester.id === customerId`, or `BARBER`'s own `Barber.id === barberId`), `NotFoundException` on mismatch.
  - `complete-appointment.use-case.ts` — see decision #2's full rewrite above; thin orchestrator around `IAppointmentsRepository.complete()`.
- **dto/**: `create-appointment.dto.ts` (barberId, serviceIds[], startsAt), `available-slots-query.dto.ts`, `appointment-response.dto.ts`, `cancel-appointment.dto.ts`, `complete-appointment.dto.ts` (which `AppointmentService` items are `redeemedWithPoints`, decided by the barber at completion time).
- **infrastructure/**: `appointments.repository.ts`, `appointments.controller.ts` (`POST /appointments`, `GET /appointments`, `GET /appointments/:id`, `GET /appointments/available-slots`, `PATCH /appointments/:id/confirm`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/complete`, and `PATCH /appointments/:id/no-show` — the last one is a gap-fill: the application-layer bullet already listed `mark-no-show.use-case.ts` but the original route list omitted its endpoint), `appointments.module.ts`.
- Tests: conflict-detection edge cases (adjacent-not-overlapping, exact-boundary), plus a **real-Postgres concurrency test** (concurrent `POST /appointments` against the same barber/window) — explicitly not mockable, called out as an exception to the "no PrismaService in tests" rule. Both live in one `test/appointments.e2e-spec.ts`, since the behavior under test is the SQL overlap query inside `createWithConflictCheck`'s `$transaction`, not application-layer logic a mocked repository could exercise.

---

## Phase 9 — `loyalty` module + commission reporting

- **domain/**: `loyalty-transaction.entity.ts`, `loyalty.repository.interface.ts` (`getBalance`, `listByCustomer` paginated — read-only; per decision #2's revision, `AppointmentsRepository.complete()` already writes `LoyaltyTransaction`/`User.loyaltyPoints` directly inside its own `$transaction`, so this module doesn't need a `createTransaction` write method Phase 8 calls into).
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
| `BarberService` capability table | 5.5 | `prisma/schema.prisma`, `barber-services.repository.ts` |
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
