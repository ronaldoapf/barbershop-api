# BcryptService — Design Spec

**Date:** 2026-06-28
**Scope:** Extract direct `bcryptjs` calls into a shared injectable service with configurable salt rounds.

---

## Problem

Four use cases (`RegisterUseCase`, `CreateBarberUseCase`, `LoginUseCase`, `RefreshTokenUseCase`) call `bcryptjs` directly. This hardcodes the salt-round value to `10` in multiple places and makes it impossible to swap the hashing implementation without touching every consumer.

---

## Solution

### `BcryptService`

**Location:** `src/shared/infrastructure/services/bcrypt.service.ts`

```typescript
@Injectable()
export class BcryptService {
  constructor(private readonly configService: ConfigService) {}

  async encrypt(plainText: string): Promise<string>
  async compare(plainText: string, hash: string): Promise<boolean>
}
```

- `encrypt` calls `bcrypt.hash(plainText, saltRounds)` where `saltRounds` is read once at construction from `configService.get<number>('BCRYPT_SALT_ROUNDS') ?? 10`.
- `compare` calls `bcrypt.compare(plainText, hash)`.
- Salt rounds default to `10` when the env var is absent so existing deployments work without config changes.

### Registration

`BcryptService` is provided in both `AuthModule` and `UsersModule` (the two modules whose use cases need it). It is **not** globally scoped — mirrors the `StorageService` pattern already in the project.

### Files changed

| File | Change |
|---|---|
| `src/shared/infrastructure/services/bcrypt.service.ts` | **Create** |
| `src/modules/auth/infrastructure/auth.module.ts` | Add `BcryptService` to providers |
| `src/modules/users/infrastructure/users.module.ts` | Add `BcryptService` to providers |
| `src/modules/auth/application/register.use-case.ts` | Inject `BcryptService`, replace `bcrypt.hash` |
| `src/modules/users/application/create-barber.use-case.ts` | Inject `BcryptService`, replace `bcrypt.hash` |
| `src/modules/auth/application/login.use-case.ts` | Inject `BcryptService`, replace `bcrypt.hash` + `bcrypt.compare` |
| `src/modules/auth/application/refresh-token.use-case.ts` | Inject `BcryptService`, replace `bcrypt.compare` |
| `src/modules/auth/application/login.use-case.spec.ts` | Mock `BcryptService` |
| `src/modules/auth/application/refresh-token.use-case.spec.ts` | Mock `BcryptService` |

### Test strategy

Unit tests for the four affected use cases switch from real bcrypt to a mocked `BcryptService`:

```typescript
const mockBcryptService = {
  encrypt: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
};
```

This removes real CPU-intensive hashing from unit tests and makes assertions explicit. The `login.use-case.spec.ts` test that currently sets up `passwordHash: bcrypt.hashSync('password123', 1)` in the fixture will instead rely on `mockBcryptService.compare` returning `true`/`false` per test case.

---

## Environment Variable

| Var | Type | Default | Description |
|---|---|---|---|
| `BCRYPT_SALT_ROUNDS` | `number` | `10` | bcrypt work factor |

---

## What does NOT change

- `prisma/seed.ts` imports `bcryptjs` directly — it runs as a standalone script outside NestJS DI. It stays as-is.
- Test fixture files that use `bcrypt.hashSync` for generating test data hashes (outside the use-case flow) may stay using bcryptjs directly.
