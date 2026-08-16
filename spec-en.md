# Barbershop Management API — Specification

## 1. Overview

API for complete management of a barbershop: barber registration, services, appointments, commissions, working hours, and loyalty program. Supports booking through both the web/app platform and a WhatsApp chatbot.

### Technical stack (non-functional requirements)
- **Framework:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Architecture:** Single-tenant (one barbershop per instance)
- **Authentication:** JWT containing `role` and `barberId` in the payload; password login and Google OAuth are both enabled simultaneously
- **Monetary convention:** values stored as integers in cents

---

## 2. Roles and Access Control

The system uses a single `User` entity with a `role` field, which can be:

| Role | Description |
|---|---|
| `OWNER` | Admin barber. Full access: manages services, invites barbers, sees all appointments, adjusts commissions. |
| `BARBER` | Regular barber. Can only view and manage their own appointments, working hours, and commission (read-only). |
| `CUSTOMER` | Client. Books appointments, views their own bookings and loyalty points balance. |

### Authorization mechanism
- **`RolesGuard` + `@Roles(...)`** — blocks entire routes by role (e.g., only `OWNER` can create services or invite barbers).
- **Automatic service-level filtering** — for reads/listing, any `BARBER` query automatically applies `WHERE barberId = <barberId from token>`; `CUSTOMER` filters by `customerId`; `OWNER` sees everything. This even prevents leaking the existence of other users' resources.
- **`AppointmentOwnershipGuard`** — for writes (update/delete), verifies that the resource's `barberId` matches the authenticated user's before allowing the mutation (except for `OWNER`, who has unrestricted access).
- **`ServiceApiKeyGuard`** — separate guard for routes called by the external WhatsApp module, authenticated via a service API key instead of a user JWT.

---

## 3. Data Model

### 3.1 `User`
Central identity entity — unifies customer, barber, and admin into a single table, differentiated by the `role` field.

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `name`, `email`, `phone` | Contact data |
| `passwordHash` | Optional — a WhatsApp customer may not have a password |
| `role` | `CUSTOMER`, `BARBER`, or `OWNER` |
| `loyaltyPoints` | Denormalized points balance (for fast reads) |
| `avatarUrl` / `avatarStorageKey` | Profile picture |
| `disabledAt` | Soft delete / account deactivation |

Login supports **local password** and **Google OAuth** simultaneously (the `Account` table holds the provider link).

### 3.2 `Barber`
Extended profile, in a 1:1 relationship with `User`, used only by users with `role: BARBER` or `OWNER`. Keeps `User` lean and isolates barber-specific data.

| Field | Description |
|---|---|
| `userId` | Unique FK to `User` |
| `commissionPercentage` | Fixed commission percentage for the barber (does not vary by service). Starts at a default value on creation and is adjusted by the `OWNER` afterward. |

### 3.3 `BarberInvite`
Controls the invitation of new barbers, sent by email.

| Field | Description |
|---|---|
| `userId` | Links to the already-created `User` (with a disabled account until acceptance) |
| `tokenHash` | Hash of the token sent by email (the plain-text token is never persisted) |
| `expiresAt` | Invite validity period |
| `acceptedAt` | Filled in when the barber accepts and sets a password |

### 3.4 `Service`
Catalog of services offered by the barbershop.

| Field | Description |
|---|---|
| `name`, `description`, `price`, `durationMinutes` | Basic service data |
| `status` | `ACTIVE` / `INACTIVE` |
| `pointsEarned` | Loyalty points earned upon completing this service |
| `pointsRequired` | Points required to redeem this service for free |

### 3.5 `BarberWorkingHours`
Configurable working hours per barber, with support for one-off exceptions.

| Field | Description |
|---|---|
| `barberId` | Owning barber |
| `type` | `WEEKLY` (recurring weekly schedule) or `SPECIFIC_DATE` (exception — day off, holiday, special hours) |
| `dayOfWeek` | Used when `type = WEEKLY` |
| `date` | Used when `type = SPECIFIC_DATE` |
| `startTime`, `endTime` | Time range |
| `isWorking` | Allows marking a specific date as "not working" |

`SPECIFIC_DATE` records take priority over `WEEKLY` ones in the availability calculation.

### 3.6 `Appointment`
A booking between a customer and a barber.

| Field | Description |
|---|---|
| `customerId` | Customer (`User`) |
| `barberId` | Barber (`Barber`) |
| `startsAt`, `endsAt` | Appointment window |
| `totalAmount` | Total amount (cents) |
| `status` | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW` |
| `source` | Origin channel: platform or WhatsApp |
| `cancellationReason`, `cancelledBy`, `cancelledAt` | Cancellation tracking |

### 3.7 `AppointmentService`
Junction table between `Appointment` and `Service` — allows multiple services in a single appointment (e.g., haircut + beard trim) and stores a **snapshot** of the service data at the time of booking, preserving history even if the service's price changes later.

| Field | Description |
|---|---|
| `appointmentId`, `serviceId` | Relations |
| `serviceName`, `price`, `durationMinutes` | Snapshot at the time of booking |
| `pointsEarned` | Points this specific item will generate |
| `redeemedWithPoints` | Whether this item was redeemed with points (free) |

### 3.8 `LoyaltyTransaction`
Full ledger of points movements, complementing the denormalized balance in `User.loyaltyPoints`.

| Field | Description |
|---|---|
| `customerId` | Customer the transaction belongs to |
| `appointmentId` | Related appointment (optional) |
| `type` | `EARN` or `REDEEM` |
| `points` | Amount moved |
| `description` | Human-readable description of the transaction |

### 3.9 `CompletedService`
Records the completion of a service and the commission generated for the barber.

### 3.10 `Setting`
Generic key-value configuration table, for administrable parameters without needing a migration (e.g., default commission value, future business rules).

---

## 4. Business Rules

### 4.1 Barbers and invites
- Only `OWNER` can register and invite other barbers.
- Invitations are sent by **email**, with a link containing a single-use token and an expiration period (7 days suggested).
- Upon accepting the invite, the barber sets their password, the account is activated, and the `Barber` record is created with `commissionPercentage` set to the system default.
- The `OWNER` adjusts the barber's commission separately, after acceptance.
- Expired invites can be resent, invalidating the previous token.

### 4.2 Management scope
- A `BARBER` can only view and manage appointments, working hours, and related data belonging to themselves.
- Commission is **read-only** for `BARBER` — only `OWNER` can change it.

### 4.3 Commission
- Commission is a **single fixed percentage per barber** (does not vary by service type).
- Applied to **each completed service** individually.
- **Pending decision:** whether the barber earns commission on a service redeemed with points (free for the customer) or not.

### 4.4 Working hours
- Configurable per barber, with a weekly schedule (`WEEKLY`) and support for one-off exceptions (`SPECIFIC_DATE`) for days off or special hours.

### 4.5 Appointments and availability
- Available time slots are **dynamic**, calculated from the duration of the chosen service(s) — they do not follow a fixed grid (e.g., 15/30 min).
- The calculation combines: the barber's working hours for the day, existing appointments (`PENDING`/`CONFIRMED`), and the total requested duration.
- Scheduling conflicts are prevented via a check inside a transaction (`$transaction`) at creation time — it re-reads the barber's appointments in the interval before confirming, avoiding double-booking under concurrency.
- Customers can book through:
  - **Platform:** authenticated with a JWT (`CUSTOMER`), requires a password.
  - **WhatsApp:** customer identified only by verified phone number, no password required. The chatbot is a **separate service/module** that consumes this API via a service API key, automatically creating the `CUSTOMER` `User` on first interaction if needed.

### 4.6 Loyalty program
- Customers earn points for each completed service, as defined by `Service.pointsEarned`.
- Customers can redeem a service **for free** using accumulated points, as defined by `Service.pointsRequired`.
- Redemption is always **all-or-nothing** (no partial discount for insufficient points).
- Redemption is decided and applied by the **barber at the time of the appointment** (not at booking time).
- Points (earned or redeemed) are only actually debited/credited to the balance when the appointment is marked `COMPLETED` — there is no points "hold" at appointment creation, which avoids the need for refunds on cancellation.
- The points balance is maintained in two ways: `User.loyaltyPoints` (fast read, denormalized) and `LoyaltyTransaction` (full, auditable ledger). Both must be updated atomically, within the same Prisma transaction, to avoid desynchronization under concurrency.

---

## 5. Barber Invitation Flow (detailed)

| Step | Route | Performed by |
|---|---|---|
| Send invite | `POST /invites` | `OWNER` |
| Validate token from the emailed link | `GET /invites/:token` | Public (via link) |
| Accept invite and set password | `POST /invites/:token/accept` | Public (via token) |
| Resend expired invite | `POST /invites/:id/resend` | `OWNER` |
| Adjust barber's commission | `PATCH /barbers/:id/commission` | `OWNER` |

---

## 6. Open Points

- **Commission on points-redeemed services:** it is not yet decided whether the barber receives normal commission (the barbershop absorbs the cost of the redemption) or no commission in that case. This could eventually be resolved as a configurable flag in `Setting` (e.g., `commission_on_redeemed_service`), avoiding hard-coding the rule.