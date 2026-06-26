# Barbershop API — Design Spec

**Date:** 2026-06-26
**Status:** Approved

---

## 1. Overview

A single-location barbershop management REST API built on NestJS 11 with strict Clean Architecture. The system manages three actor types (Customer, Barber, Owner), a service catalog with categories and packages, barber scheduling, appointment booking with conflict detection, and event-driven notifications via email and SMS.

---

## 2. Actors & Roles

| Role | Description |
|---|---|
| `CUSTOMER` | Self-registers, books appointments, cancels/reschedules within the allowed window |
| `BARBER` | Manages own working hours, confirms/completes/marks no-show for own appointments |
| `OWNER` | Full administrative access — manages all users, services, packages, schedules, settings |

---

## 3. Module Map

```
src/modules/
├── auth/           # JWT login, Google OAuth, token refresh
├── users/          # Accounts for all roles + barber composition
├── services/       # Categories, services, packages
├── schedules/      # Barber working hours (weekly + date-specific overrides)
├── appointments/   # Booking, cancellation, rescheduling, status transitions
├── notifications/  # Email (Resend) + SMS — purely event-driven, no public endpoints
└── settings/       # Owner-configurable key-value store
```

**Dependency rules (no cycles):**
- `appointments` → `services`, `schedules`, `users`
- `notifications` ← events only (never imports `appointments`)
- `schedules` → `users`
- `auth` → `users`
- `settings` → no module dependencies

Cross-module side effects go exclusively through `EventEmitter2`. No module imports another module's use cases directly — only exported repository interfaces.

---

## 4. Domain Entities & Data Model

### `UserEntity`
```
id, name, email,
phone (optional for CUSTOMER, required for BARBER/OWNER),
passwordHash, role (CUSTOMER | BARBER | OWNER),
loyaltyPoints (integer, default 0 — current balance, only meaningful for CUSTOMER),
avatarUrl, avatarStorageKey, createdAt, disabledAt
```

### `AccountEntity`
Tracks OAuth provider connections per user. Allows one user to connect multiple providers and merges accounts by email automatically.
```
id, userId (FK → users), provider (GOOGLE | ...),
providerAccountId (unique ID from the provider),
createdAt
```

### `SessionEntity`
Tracks active refresh tokens per user. Supports multiple concurrent sessions (e.g., web + mobile). On logout the row is deleted; on refresh the old row is deleted and a new one is created (rotation).
```
id, userId (FK → users), refreshTokenHash,
userAgent (nullable), ipAddress (nullable),
expiresAt, createdAt
```

### `BarberEntity`
Composition record created alongside the user when role = BARBER. Keeps barber-specific data out of the users table.
```
id, userId (FK → users, unique), commissionPercentage (decimal),
createdAt, disabledAt
```

### `CategoryEntity`
```
id, name, order (display position), createdAt, disabledAt
```

### `ServiceEntity`
```
id, categoryId (FK → categories, nullable),
name, description, price (integer cents), durationMinutes,
status (ACTIVE | INACTIVE), order,
pointsEarned (integer — points credited when this service is in a completed appointment),
pointsRequired (integer — points needed to redeem this service for free),
createdAt, disabledAt
```
> `status` is an explicit business toggle (temporary deactivation). `disabledAt` is for permanent soft-delete. `order` controls catalog display sequence.

### `PackageEntity`
A pre-defined bundle of services with its own price (can be discounted vs. sum of parts).
```
id, name, description, price (integer cents),
status (ACTIVE | INACTIVE), order,
pointsEarned (integer — points credited when this package is in a completed appointment),
pointsRequired (integer — points needed to redeem this package for free),
createdAt, disabledAt
```

### `PackageServiceEntity`
Join table — which services belong to a package.
```
id, packageId (FK → packages), serviceId (FK → services)
```

### `BarberWorkingHoursEntity`
Unifies weekly recurring schedule and date-specific overrides in one table.
```
id, barberId (FK → barbers),
type (WEEKLY | SPECIFIC_DATE),
dayOfWeek (0–6, used when type = WEEKLY),
date (used when type = SPECIFIC_DATE),
startTime (nullable — null when isWorking = false),
endTime (nullable — null when isWorking = false),
isWorking (boolean — false = day off),
createdAt, disabledAt
```

**Availability resolution rule:** for a given barber + date, first check for a `SPECIFIC_DATE` row (override wins). If none, fall back to the `WEEKLY` row for that `dayOfWeek`. If neither exists, the barber is not working that day.

### `AppointmentEntity`
```
id, customerId (FK → users), barberId (FK → barbers),
packageId (FK → packages, nullable — null for individual service bookings),
startsAt,
endsAt (nullable — barber sets actual finish time on completion),
totalAmount (integer cents — package price OR sum of individual service prices, snapshotted at booking time),
status (PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW),
cancellationReason?, cancelledBy (userId)?, cancelledAt?,
createdAt, disabledAt
```

### `AppointmentServiceEntity`
Always populated, even for package bookings (lists every component service). Snapshots protect against future catalog changes.
```
id, appointmentId (FK → appointments), serviceId (FK → services),
serviceName (snapshot), price (snapshot, integer cents), durationMinutes (snapshot),
pointsEarned (snapshot), redeemedWithPoints (boolean, default false),
createdAt
```
> For package bookings: `totalAmount` = the package price (not sum of individual prices). `AppointmentService` rows list all component services so the barber knows what to perform and the system can compute the expected duration window for conflict detection.
> `redeemedWithPoints = true` marks the one service in the appointment that was redeemed for free using loyalty points. Its contribution to `totalAmount` is zero.

### `LoyaltyTransactionEntity`
Audit trail for every loyalty earn and redeem event.
```
id, customerId (FK → users), appointmentId (FK → appointments, nullable),
type (EARN | REDEEM), points (integer),
description, createdAt
```

### `SettingEntity`
Owner-configurable key-value store.
```
id, key (unique string), value (string), updatedAt
```

| Key | Default | Description |
|---|---|---|
| `cancellation_window_hours` | `"24"` | How many hours before appointment a customer can still cancel/reschedule |
| `slot_interval_minutes` | `"30"` | Granularity of generated availability slots |
| `loyalty_enabled` | `"false"` | Global toggle for the loyalty/points system |

---

## 5. API Endpoints

### `auth`
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Customer self-registration |
| POST | `/auth/login` | Public | Email + password → JWT |
| POST | `/auth/refresh` | Public | Rotate access + refresh token |
| POST | `/auth/logout` | Authenticated | Invalidate refresh token |
| GET | `/auth/google` | Public | Google OAuth redirect |
| GET | `/auth/google/callback` | Public | Google OAuth callback |

### `users`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/users/me` | Authenticated | Own profile |
| PATCH | `/users/me` | Authenticated | Update own profile |
| POST | `/users/me/avatar/presign` | Authenticated | Get presigned URL for avatar upload |
| PATCH | `/users/me/avatar/confirm` | Authenticated | Persist avatar after S3 upload |
| GET | `/users` | Owner | List all users (paginated, filter by role) |
| POST | `/users/barbers` | Owner | Create barber account |
| GET | `/users/barbers` | Owner | List barbers |
| GET | `/users/barbers/:id` | Owner | Barber detail |
| PATCH | `/users/barbers/:id` | Owner | Update barber |
| DELETE | `/users/barbers/:id` | Owner | Soft-delete barber |

### `services`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/categories` | Public | List categories |
| POST | `/categories` | Owner | Create category |
| PATCH | `/categories/:id` | Owner | Update category |
| DELETE | `/categories/:id` | Owner | Soft-delete category |
| GET | `/services` | Public | List services (filter by category, status) |
| POST | `/services` | Owner | Create service |
| PATCH | `/services/:id` | Owner | Update service |
| PATCH | `/services/:id/status` | Owner | Toggle ACTIVE / INACTIVE |
| DELETE | `/services/:id` | Owner | Soft-delete service |
| GET | `/packages` | Public | List packages |
| POST | `/packages` | Owner | Create package |
| PATCH | `/packages/:id` | Owner | Update package |
| PATCH | `/packages/:id/status` | Owner | Toggle ACTIVE / INACTIVE |
| DELETE | `/packages/:id` | Owner | Soft-delete package |

### `schedules`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/barbers/:barberId/working-hours` | Authenticated | Get barber's working hours entries |
| POST | `/barbers/:barberId/working-hours` | Owner or own Barber | Add a working hours entry |
| PATCH | `/barbers/:barberId/working-hours/:id` | Owner or own Barber | Update an entry |
| DELETE | `/barbers/:barberId/working-hours/:id` | Owner or own Barber | Soft-delete an entry |
| GET | `/barbers/:barberId/availability` | Authenticated | Available time slots for `?date=YYYY-MM-DD` |

### `appointments`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/appointments` | Authenticated | Own appointments (owner sees all, barber sees own, customer sees own) |
| POST | `/appointments` | Customer | Create appointment (services or package) |
| GET | `/appointments/:id` | Authenticated | Appointment detail |
| PATCH | `/appointments/:id/confirm` | Barber (own) / Owner | Confirm appointment |
| PATCH | `/appointments/:id/complete` | Barber (own) / Owner | Mark completed + set `endsAt` |
| PATCH | `/appointments/:id/no-show` | Barber (own) / Owner | Mark no-show |
| PATCH | `/appointments/:id/cancel` | Customer (within window) / Barber / Owner | Cancel with optional reason |
| PATCH | `/appointments/:id/reschedule` | Customer (within window) / Barber / Owner | Move to new `startsAt` |

### `settings`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/settings` | Owner | List all configurable keys + values |
| PATCH | `/settings` | Owner | Update one or more settings |

### `loyalty` (within `users` module)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/users/me/loyalty` | Customer | Points balance + transaction history |

### `notifications`
No public endpoints. Purely event-driven internal module.

---

## 6. Authentication & Authorization

### Token Strategy
- **Access token:** short-lived JWT (15 min), signed with `JWT_SECRET`, carries `{ sub: userId, role }`
- **Refresh token:** long-lived (7 days), stored hashed on `UserEntity`, rotated on every `/auth/refresh` — old token is invalidated immediately
- **Google OAuth flow:**
  1. Receive callback with Google profile (`sub`, `email`, `name`)
  2. Look up `Account` by `provider = GOOGLE` + `providerAccountId = google.sub`
     - **Found** → issue tokens for the linked user
     - **Not found** → check if `users.email` matches
       - **Email exists** → link Google account (create `Account` row), issue tokens
       - **Email not found** → create new `UserEntity` (CUSTOMER) + `Account` row, issue tokens

### Guards
| Guard | Usage |
|---|---|
| `JwtAuthGuard` | All protected routes |
| `RolesGuard` + `@Roles(UserRole.OWNER)` | Owner-only routes |
| `BarberSelfOrOwnerGuard` | Barber can act on own resources; owner can act on any barber |
| `AppointmentAccessGuard` | Scopes customer to own appointments and enforces cancellation window |

### Role Permission Matrix
| Action | CUSTOMER | BARBER | OWNER |
|---|---|---|---|
| Book / cancel / reschedule own appointment | ✓ (within window) | — | — |
| View own appointments | ✓ | ✓ | ✓ |
| View all appointments | — | own only | ✓ |
| Confirm / complete / no-show | — | own only | ✓ |
| Manage own working hours | — | ✓ | ✓ |
| Manage any barber's working hours | — | — | ✓ |
| Manage service catalog / packages / categories | — | — | ✓ |
| Manage barber accounts | — | — | ✓ |
| Manage settings | — | — | ✓ |
| View public catalog & availability | ✓ | ✓ | ✓ |

---

## 7. Scheduling & Availability Logic

**Slot generation** (`GET /barbers/:barberId/availability?date=YYYY-MM-DD`):

1. Resolve working hours for the requested date:
   - Look for a `SPECIFIC_DATE` row → if `isWorking = false`, return empty (day off)
   - Fall back to `WEEKLY` row for that `dayOfWeek`
   - If neither exists → return empty
2. Generate candidate slots from `startTime` to `endTime` using `slot_interval_minutes` from settings
3. Load existing appointments for that barber on that date with status `PENDING | CONFIRMED`
4. For each existing appointment, compute its occupied window: `startsAt → startsAt + sum(AppointmentService.durationMinutes)`
5. Remove any candidate slot that overlaps an occupied window
6. Return remaining slots

**Conflict check on booking** (inside `CreateAppointmentUseCase`):
- Re-runs the same overlap check at write time to handle race conditions
- If a conflict is found → `ConflictException("Slot no longer available")`

---

## 8. Appointment Lifecycle

### Status Flow
```
PENDING → CONFIRMED → COMPLETED
                    ↘ NO_SHOW
       ↘ CANCELLED (from PENDING or CONFIRMED)
```

| Status | Set by | Description |
|---|---|---|
| `PENDING` | System on creation | Awaiting barber/owner confirmation |
| `CONFIRMED` | Barber / Owner | Appointment accepted |
| `COMPLETED` | Barber / Owner | Done; `endsAt` is written |
| `NO_SHOW` | Barber / Owner | Customer did not show up |
| `CANCELLED` | Customer / Barber / Owner | Stores `cancellationReason`, `cancelledBy`, `cancelledAt` |

### Cancellation Window
- Setting: `cancellation_window_hours` (default `"24"`)
- **Customer:** can cancel/reschedule only if `startsAt - now > cancellation_window_hours`. Outside window → `ForbiddenException`
- **Barber / Owner:** no window restriction

### Reschedule Behaviour
- Updates `startsAt` on the same appointment record; status resets to `PENDING`
- Triggers availability conflict check on the new slot
- Emits `appointment.rescheduled` event

### Loyalty Points Flow

**At booking (`CreateAppointmentUseCase`):**
1. If customer submits a `redeemServiceId`, check `loyalty_enabled = true` and `customer.loyaltyPoints ≥ service.pointsRequired`
2. If valid: set `AppointmentServiceEntity.redeemedWithPoints = true` for that service, subtract its price from `totalAmount`, deduct points from `customer.loyaltyPoints`, create a `LoyaltyTransaction` of type `REDEEM`
3. Only one service per appointment may be redeemed with points

**At completion (`CompleteAppointmentUseCase`):**
1. If `loyalty_enabled = true`, sum `pointsEarned` across all `AppointmentService` rows (snapshot field)
2. Add total to `customer.loyaltyPoints`, create a `LoyaltyTransaction` of type `EARN`
3. If appointment is later cancelled after completion — points earned are **not** reversed (owner handles edge cases manually)

---

## 9. Notifications

Purely event-driven. The `notifications` module listens via `EventEmitter2` and never imports from `appointments`.

### Event → Action Map
| Event | Email | SMS |
|---|---|---|
| `appointment.created` | Confirmation to customer (date, time, barber, services, total) | Same to customer |
| `appointment.confirmed` | "Appointment confirmed" to customer | Same to customer |
| `appointment.cancelled` | Cancellation notice to customer + barber | Cancellation notice to customer |
| `appointment.rescheduled` | New time notice to customer + barber | New time to customer |
| `appointment.reminder` | 24h reminder to customer | 24h reminder to customer |

### Channels
- **Email:** Resend (already in stack)
- **SMS:** Abstract `ISmsService` in `notifications/domain/`. Concrete implementation wired in `notifications/infrastructure/`. Recommended providers: **Zenvia** (BR-native, better local rates) or **Twilio** (global). Swapping providers only requires a new implementation class.

### Reminder Job
- On appointment creation, `CreateAppointmentUseCase` enqueues a BullMQ delayed job for `startsAt - 24h`
- Processor lives in `notifications/infrastructure/`
- On cancellation, `CancelAppointmentUseCase` removes the job from the queue by `appointmentId`

---

## 10. Error Handling

Following the existing architecture:

- `P2002` (unique constraint) → caught at repository layer → `ConflictException`
- `P2025` (record not found) → caught at repository layer → `NotFoundException`
- Remaining Prisma errors → `DatabaseExceptionFilter` (global)
- Slot conflict at booking time → `ConflictException("Slot no longer available")`
- Cancellation outside window → `ForbiddenException("Cancellation window has passed")`
- Invalid status transition → `BadRequestException`

---

## 11. Environment Variables

```bash
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
RESEND_API_KEY=
SMS_PROVIDER_API_KEY=
REDIS_URL=
FRONTEND_URL=
```

---

## 12. Notes

### Owner Account Creation
There is no public endpoint to create an OWNER account. The first owner is seeded via a Prisma seed script (`prisma/seed.ts`) during initial setup. Subsequent owner accounts (if ever needed) are created directly in the database or via a protected admin script — never through the public API.

---

## 13. Out of Scope

- Payment processing (handled in-person)
- Multi-location support
- Barber portfolio / photo gallery
- Reviews and ratings
