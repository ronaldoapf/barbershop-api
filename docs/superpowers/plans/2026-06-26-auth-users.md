# Barbershop API — Auth & Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement authentication (JWT, Google OAuth, sessions) and the full users module (customer profile, barber account management, avatar upload).

**Architecture:** Auth module handles token issuance via JWT + Google OAuth; Users module owns UserEntity and BarberEntity. AuthModule imports UsersModule for IUsersRepository. Sessions and OAuth accounts have their own repository interfaces inside AuthModule. Shared guards and decorators live in `src/shared/`.

**Tech Stack:** @nestjs/jwt, @nestjs/passport, passport-jwt, passport-google-oauth20, bcryptjs, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner

## Global Constraints

- Package manager: npm only
- All source code and comments in English; user-facing messages in pt-BR
- Soft deletes: every read filters `disabledAt: null`
- Never read `process.env` directly — use `ConfigService`
- Prices in integer cents; file names kebab-case; classes PascalCase

---

## File Structure

```
src/
  modules/
    auth/
      application/
        register.use-case.ts + spec
        login.use-case.ts + spec
        refresh-token.use-case.ts + spec
        logout.use-case.ts + spec
        google-oauth.use-case.ts + spec
      domain/
        sessions.repository.interface.ts
        accounts.repository.interface.ts
      dto/
        register.dto.ts
        login.dto.ts
        refresh-token.dto.ts
        auth-response.dto.ts
      infrastructure/
        jwt.strategy.ts
        google.strategy.ts
        sessions.repository.ts
        accounts.repository.ts
        auth.controller.ts
        auth.module.ts
    users/
      application/
        get-me.use-case.ts + spec
        update-me.use-case.ts + spec
        list-users.use-case.ts + spec
        create-barber.use-case.ts + spec
        get-barber.use-case.ts + spec
        list-barbers.use-case.ts + spec
        update-barber.use-case.ts + spec
        delete-barber.use-case.ts + spec
        presign-avatar.use-case.ts + spec
        confirm-avatar.use-case.ts + spec
        get-loyalty.use-case.ts + spec
      domain/
        user.entity.ts
        user-role.enum.ts
        barber.entity.ts
        users.repository.interface.ts
        barbers.repository.interface.ts
      dto/
        user-response.dto.ts
        barber-response.dto.ts
        update-me.dto.ts
        create-barber.dto.ts
        update-barber.dto.ts
        confirm-avatar.dto.ts
        presign-avatar-response.dto.ts
        loyalty-response.dto.ts
      infrastructure/
        users.repository.ts
        barbers.repository.ts
        users.controller.ts
        users.module.ts
  shared/
    guards/
      jwt-auth.guard.ts
      optional-jwt-auth.guard.ts
      roles.guard.ts
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
    infrastructure/
      services/
        storage.service.ts
prisma/
  seed.ts
```

---

### Task 1: Domain Entities & Repository Interfaces

**Files:**
- Create: `src/modules/users/domain/user-role.enum.ts`
- Create: `src/modules/users/domain/user.entity.ts`
- Create: `src/modules/users/domain/barber.entity.ts`
- Create: `src/modules/users/domain/users.repository.interface.ts`
- Create: `src/modules/users/domain/barbers.repository.interface.ts`
- Create: `src/modules/auth/domain/sessions.repository.interface.ts`
- Create: `src/modules/auth/domain/accounts.repository.interface.ts`

**Interfaces:**
- Produces: `UserEntity`, `BarberEntity`, `IUsersRepository`, `IBarbersRepository`, `ISessionsRepository`, `IAccountsRepository` — consumed by all use cases in this plan

- [ ] **Step 1: Create `src/modules/users/domain/user-role.enum.ts`**

```typescript
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BARBER = 'BARBER',
  OWNER = 'OWNER',
}
```

- [ ] **Step 2: Create `src/modules/users/domain/user.entity.ts`**

```typescript
import { UserRole } from './user-role.enum';

export class UserEntity {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  loyaltyPoints: number;
  avatarUrl: string | null;
  avatarStorageKey: string | null;
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 3: Create `src/modules/users/domain/barber.entity.ts`**

```typescript
import { UserEntity } from './user.entity';

export class BarberEntity {
  id: string;
  userId: string;
  commissionPercentage: number;
  user: UserEntity;
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 4: Create `src/modules/users/domain/users.repository.interface.ts`**

```typescript
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { UserEntity } from './user.entity';
import { UserRole } from './user-role.enum';

export abstract class IUsersRepository {
  abstract create(data: {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string | null;
    role: UserRole;
  }): Promise<UserEntity>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract update(id: string, data: Partial<{ name: string; phone: string | null; avatarUrl: string | null; avatarStorageKey: string | null }>): Promise<UserEntity>;
  abstract updateLoyaltyPoints(id: string, delta: number): Promise<void>;
  abstract softDelete(id: string): Promise<void>;
  abstract findAll(params: { role?: UserRole; page: number; limit: number }): Promise<PaginatedResult<UserEntity>>;
}
```

- [ ] **Step 5: Create `src/modules/users/domain/barbers.repository.interface.ts`**

```typescript
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { BarberEntity } from './barber.entity';

export abstract class IBarbersRepository {
  abstract create(data: { userId: string; commissionPercentage: number }): Promise<BarberEntity>;
  abstract findById(id: string): Promise<BarberEntity | null>;
  abstract findByUserId(userId: string): Promise<BarberEntity | null>;
  abstract findAll(params: { page: number; limit: number }): Promise<PaginatedResult<BarberEntity>>;
  abstract update(id: string, data: Partial<{ commissionPercentage: number }>): Promise<BarberEntity>;
  abstract softDelete(id: string): Promise<void>;
}
```

- [ ] **Step 6: Create `src/modules/auth/domain/sessions.repository.interface.ts`**

```typescript
export abstract class ISessionsRepository {
  abstract create(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<void>;
  abstract findById(id: string): Promise<{ id: string; userId: string; refreshTokenHash: string; expiresAt: Date } | null>;
  abstract deleteById(id: string): Promise<void>;
}
```

- [ ] **Step 7: Create `src/modules/auth/domain/accounts.repository.interface.ts`**

```typescript
export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
}

export abstract class IAccountsRepository {
  abstract create(data: { userId: string; provider: OAuthProvider; providerAccountId: string }): Promise<void>;
  abstract findByProvider(provider: OAuthProvider, providerAccountId: string): Promise<{ userId: string } | null>;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/
git commit -m "feat(users): add domain entities and repository interfaces"
```

---

### Task 2: Shared Guards & Decorators

**Files:**
- Create: `src/shared/guards/jwt-auth.guard.ts`
- Create: `src/shared/guards/optional-jwt-auth.guard.ts`
- Create: `src/shared/guards/roles.guard.ts`
- Create: `src/shared/decorators/current-user.decorator.ts`
- Create: `src/shared/decorators/roles.decorator.ts`

**Interfaces:**
- Produces: `JwtAuthGuard`, `OptionalJwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()` — used in all controllers from this plan onward

- [ ] **Step 1: Create `src/shared/guards/jwt-auth.guard.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 2: Create `src/shared/guards/optional-jwt-auth.guard.ts`**

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: unknown, user: T): T {
    return user;
  }
}
```

- [ ] **Step 3: Create `src/shared/guards/roles.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/domain/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    const { user } = context.switchToHttp().getRequest<{ user: { role: UserRole } }>();
    return roles.includes(user?.role);
  }
}
```

- [ ] **Step 4: Create `src/shared/decorators/roles.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/domain/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 5: Create `src/shared/decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../modules/users/domain/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): { id: string; role: string } => {
    const request = ctx.switchToHttp().getRequest<{ user: { id: string; role: string } }>();
    return request.user;
  },
);
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/guards/ src/shared/decorators/
git commit -m "feat(shared): add JWT guards, RolesGuard, and CurrentUser/Roles decorators"
```

---

### Task 3: Auth Use Cases — Register & Login

**Files:**
- Create: `src/modules/auth/dto/register.dto.ts`
- Create: `src/modules/auth/dto/login.dto.ts`
- Create: `src/modules/auth/dto/refresh-token.dto.ts`
- Create: `src/modules/auth/dto/auth-response.dto.ts`
- Create: `src/modules/auth/application/register.use-case.ts`
- Create: `src/modules/auth/application/register.use-case.spec.ts`
- Create: `src/modules/auth/application/login.use-case.ts`
- Create: `src/modules/auth/application/login.use-case.spec.ts`

**Interfaces:**
- Consumes: `IUsersRepository`, `ISessionsRepository`, `JwtService`, `ConfigService`
- Produces:
  - `RegisterUseCase.execute(dto: RegisterDto): Promise<UserEntity>`
  - `LoginUseCase.execute(dto, meta): Promise<{ accessToken: string; refreshToken: string }>`
  - `LoginUseCase.issueTokens(userId, role, meta): Promise<{ accessToken: string; refreshToken: string }>` — also used by Refresh and GoogleOAuth use cases

- [ ] **Step 1: Create DTOs**

`src/modules/auth/dto/register.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
```

`src/modules/auth/dto/login.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
```

`src/modules/auth/dto/refresh-token.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
```

`src/modules/auth/dto/auth-response.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
```

- [ ] **Step 2: Write failing tests for RegisterUseCase**

`src/modules/auth/application/register.use-case.spec.ts`:
```typescript
import { ConflictException } from '@nestjs/common';
import { RegisterUseCase } from './register.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { UserEntity } from '../../users/domain/user.entity';

const mockUsersRepo = (): jest.Mocked<IUsersRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  updateLoyaltyPoints: jest.fn(),
  softDelete: jest.fn(),
  findAll: jest.fn(),
});

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;

  beforeEach(() => {
    usersRepo = mockUsersRepo();
    useCase = new RegisterUseCase(usersRepo);
  });

  it('throws ConflictException if email already exists', async () => {
    usersRepo.findByEmail.mockResolvedValue({ id: '1' } as UserEntity);
    await expect(
      useCase.execute({ name: 'Ana', email: 'ana@test.com', password: 'password123' }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates user with hashed password when email is new', async () => {
    usersRepo.findByEmail.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue({ id: '1', role: UserRole.CUSTOMER } as UserEntity);

    await useCase.execute({ name: 'Ana', email: 'ana@test.com', password: 'password123' });

    expect(usersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@test.com', role: UserRole.CUSTOMER }),
    );
    const calledWith = usersRepo.create.mock.calls[0][0];
    expect(calledWith.passwordHash).not.toBe('password123');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest src/modules/auth/application/register.use-case.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './register.use-case'`.

- [ ] **Step 4: Implement `src/modules/auth/application/register.use-case.ts`**

```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      role: UserRole.CUSTOMER,
    });
  }
}
```

- [ ] **Step 5: Write failing tests for LoginUseCase**

`src/modules/auth/application/login.use-case.spec.ts`:
```typescript
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginUseCase } from './login.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { UserEntity } from '../../users/domain/user.entity';
import * as bcrypt from 'bcryptjs';

const mockUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  Object.assign(new UserEntity(), {
    id: 'user-1',
    email: 'ana@test.com',
    passwordHash: bcrypt.hashSync('password123', 1),
    role: UserRole.CUSTOMER,
    disabledAt: null,
    ...overrides,
  });

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let sessionsRepo: jest.Mocked<ISessionsRepository>;

  beforeEach(() => {
    usersRepo = { findByEmail: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    sessionsRepo = { create: jest.fn() } as unknown as jest.Mocked<ISessionsRepository>;
    const jwtService = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService;
    useCase = new LoginUseCase(usersRepo, sessionsRepo, jwtService, configService);
  });

  it('throws UnauthorizedException when user not found', async () => {
    usersRepo.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when password is wrong', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser());
    await expect(useCase.execute({ email: 'ana@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when user is disabled', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser({ disabledAt: new Date() }));
    await expect(useCase.execute({ email: 'ana@test.com', password: 'password123' })).rejects.toThrow(ForbiddenException);
  });

  it('returns tokens on valid credentials', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser());
    sessionsRepo.create.mockResolvedValue(undefined);
    const result = await useCase.execute({ email: 'ana@test.com', password: 'password123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});
```

- [ ] **Step 6: Implement `src/modules/auth/application/login.use-case.ts`**

```typescript
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly sessionsRepository: ISessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    dto: LoginDto,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciais inválidas');
    if (user.disabledAt) throw new ForbiddenException('Conta desativada');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.issueTokens(user.id, user.role, meta);
  }

  async issueTokens(
    userId: string,
    role: UserRole,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = randomUUID();
    const accessToken = this.jwtService.sign({ sub: userId, role });
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: sessionId },
      { secret: this.configService.get<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.sessionsRepository.create({
      id: sessionId,
      userId,
      refreshTokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 7: Run all auth use case tests so far**

```bash
npx jest src/modules/auth/application/ --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 8: Commit**

```bash
git add src/modules/auth/
git commit -m "feat(auth): add RegisterUseCase and LoginUseCase"
```

---

### Task 4: Auth Use Cases — Refresh, Logout, Google OAuth

**Files:**
- Create: `src/modules/auth/application/refresh-token.use-case.ts` + spec
- Create: `src/modules/auth/application/logout.use-case.ts` + spec
- Create: `src/modules/auth/application/google-oauth.use-case.ts` + spec

**Interfaces:**
- Consumes: `LoginUseCase.issueTokens()`, `ISessionsRepository`, `IUsersRepository`, `IAccountsRepository`, `JwtService`, `ConfigService`
- Produces:
  - `RefreshTokenUseCase.execute(token, meta): Promise<{ accessToken; refreshToken }>`
  - `LogoutUseCase.execute(token): Promise<void>`
  - `GoogleOAuthUseCase.execute(profile, meta): Promise<{ accessToken; refreshToken }>`

- [ ] **Step 1: Write failing test for RefreshTokenUseCase**

`src/modules/auth/application/refresh-token.use-case.spec.ts`:
```typescript
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { LoginUseCase } from './login.use-case';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let sessionsRepo: jest.Mocked<ISessionsRepository>;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let loginUseCase: jest.Mocked<LoginUseCase>;

  beforeEach(() => {
    sessionsRepo = { findById: jest.fn(), deleteById: jest.fn() } as unknown as jest.Mocked<ISessionsRepository>;
    usersRepo = { findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    jwtService = { verify: jest.fn(), sign: jest.fn() } as unknown as jest.Mocked<JwtService>;
    loginUseCase = { issueTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }) } as unknown as jest.Mocked<LoginUseCase>;
    const configService = { get: jest.fn().mockReturnValue('refresh-secret') } as unknown as ConfigService;
    useCase = new RefreshTokenUseCase(sessionsRepo, usersRepo, loginUseCase, jwtService, configService);
  });

  it('throws UnauthorizedException when JWT is invalid', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error(); });
    await expect(useCase.execute('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session not found', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'session-1' });
    sessionsRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session is expired', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'session-1' });
    sessionsRepo.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: await bcrypt.hash('token', 1),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(useCase.execute('token')).rejects.toThrow(UnauthorizedException);
  });

  it('rotates tokens on valid refresh', async () => {
    const token = 'valid-token';
    jwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'session-1' });
    sessionsRepo.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: await bcrypt.hash(token, 1),
      expiresAt: new Date(Date.now() + 100000),
    });
    usersRepo.findById.mockResolvedValue({ id: 'user-1', role: UserRole.CUSTOMER, disabledAt: null } as UserEntity);

    const result = await useCase.execute(token);
    expect(sessionsRepo.deleteById).toHaveBeenCalledWith('session-1');
    expect(result).toHaveProperty('accessToken');
  });
});
```

- [ ] **Step 2: Implement `src/modules/auth/application/refresh-token.use-case.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { LoginUseCase } from './login.use-case';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly sessionsRepository: ISessionsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly loginUseCase: LoginUseCase,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de atualização inválido');
    }

    const session = await this.sessionsRepository.findById(payload.jti);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Sessão não encontrada');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Token de atualização inválido');

    await this.sessionsRepository.deleteById(payload.jti);

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || user.disabledAt) throw new UnauthorizedException('Usuário não encontrado');

    return this.loginUseCase.issueTokens(user.id, user.role, meta);
  }
}
```

- [ ] **Step 3: Implement `src/modules/auth/application/logout.use-case.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ISessionsRepository } from '../domain/sessions.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly sessionsRepository: ISessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<{ jti: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      await this.sessionsRepository.deleteById(payload.jti);
    } catch {
      // Best-effort: ignore invalid tokens on logout
    }
  }
}
```

- [ ] **Step 4: Implement `src/modules/auth/application/google-oauth.use-case.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { IAccountsRepository, OAuthProvider } from '../domain/accounts.repository.interface';
import { LoginUseCase } from './login.use-case';

@Injectable()
export class GoogleOAuthUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly accountsRepository: IAccountsRepository,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  async execute(
    profile: { sub: string; email: string; name: string },
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const account = await this.accountsRepository.findByProvider(OAuthProvider.GOOGLE, profile.sub);
    if (account) {
      const user = await this.usersRepository.findById(account.userId);
      if (!user || user.disabledAt) throw new UnauthorizedException('Conta desativada');
      return this.loginUseCase.issueTokens(user.id, user.role, meta);
    }

    let user = await this.usersRepository.findByEmail(profile.email);
    if (!user) {
      user = await this.usersRepository.create({
        name: profile.name,
        email: profile.email,
        phone: null,
        passwordHash: null,
        role: UserRole.CUSTOMER,
      });
    }

    await this.accountsRepository.create({
      userId: user.id,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.sub,
    });

    return this.loginUseCase.issueTokens(user.id, user.role, meta);
  }
}
```

- [ ] **Step 5: Run all auth use case tests**

```bash
npx jest src/modules/auth/application/ --no-coverage
```

Expected: PASS — 9+ tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/application/
git commit -m "feat(auth): add RefreshTokenUseCase, LogoutUseCase, and GoogleOAuthUseCase"
```

---

### Task 5: Auth Infrastructure — Strategies, Repositories, Controller, Module

**Files:**
- Create: `src/modules/auth/infrastructure/jwt.strategy.ts`
- Create: `src/modules/auth/infrastructure/google.strategy.ts`
- Create: `src/modules/auth/infrastructure/sessions.repository.ts`
- Create: `src/modules/auth/infrastructure/accounts.repository.ts`
- Create: `src/modules/auth/infrastructure/auth.controller.ts`
- Create: `src/modules/auth/infrastructure/auth.module.ts`
- Create: `src/modules/users/dto/user-response.dto.ts`

**Interfaces:**
- Consumes: all use cases from Tasks 3–4, `PrismaService` (from global `PrismaModule`), `JwtModule`, `PassportModule`
- Produces: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/google`, `GET /auth/google/callback`

- [ ] **Step 1: Create `src/modules/users/dto/user-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../domain/user-role.enum';
import { UserEntity } from '../domain/user.entity';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() loyaltyPoints: number;
  @ApiPropertyOptional() avatarUrl: string | null;
  @ApiProperty() createdAt: Date;
}

export function toUserResponseDto(user: UserEntity): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    loyaltyPoints: user.loyaltyPoints,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
```

- [ ] **Step 2: Create `src/modules/auth/infrastructure/jwt.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../users/domain/user-role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; role: UserRole }): { id: string; role: UserRole } {
    return { id: payload.sub, role: payload.role };
  }
}
```

- [ ] **Step 3: Create `src/modules/auth/infrastructure/google.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${configService.get<string>('FRONTEND_URL')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails: Array<{ value: string }>; displayName: string },
  ): { sub: string; email: string; name: string } {
    return { sub: profile.id, email: profile.emails[0].value, name: profile.displayName };
  }
}
```

- [ ] **Step 4: Create `src/modules/auth/infrastructure/sessions.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ISessionsRepository } from '../domain/sessions.repository.interface';

@Injectable()
export class SessionsRepository implements ISessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.session.create({ data });
  }

  async findById(id: string): Promise<{ id: string; userId: string; refreshTokenHash: string; expiresAt: Date } | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }
}
```

- [ ] **Step 5: Create `src/modules/auth/infrastructure/accounts.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IAccountsRepository, OAuthProvider } from '../domain/accounts.repository.interface';

@Injectable()
export class AccountsRepository implements IAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { userId: string; provider: OAuthProvider; providerAccountId: string }): Promise<void> {
    await this.prisma.account.create({ data });
  }

  async findByProvider(provider: OAuthProvider, providerAccountId: string): Promise<{ userId: string } | null> {
    return this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      select: { userId: true },
    });
  }
}
```

- [ ] **Step 6: Create `src/modules/auth/infrastructure/auth.controller.ts`**

```typescript
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RegisterUseCase } from '../application/register.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { GoogleOAuthUseCase } from '../application/google-oauth.use-case';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { UserResponseDto, toUserResponseDto } from '../../users/dto/user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly googleOAuthUseCase: GoogleOAuthUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return toUserResponseDto(await this.registerUseCase.execute(dto));
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto, { userAgent: req.headers['user-agent'], ipAddress: req.ip });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.refreshTokenUseCase.execute(dto.refreshToken, { userAgent: req.headers['user-agent'], ipAddress: req.ip });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current session' })
  @ApiResponse({ status: 200 })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  googleAuth(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async googleCallback(
    @Req() req: Request & { user: { sub: string; email: string; name: string } },
  ): Promise<AuthResponseDto> {
    return this.googleOAuthUseCase.execute(req.user, { userAgent: req.headers['user-agent'], ipAddress: req.ip });
  }
}
```

- [ ] **Step 7: Create `src/modules/auth/infrastructure/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RegisterUseCase } from '../application/register.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { GoogleOAuthUseCase } from '../application/google-oauth.use-case';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { SessionsRepository } from './sessions.repository';
import { AccountsRepository } from './accounts.repository';
import { AuthController } from './auth.controller';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { IAccountsRepository } from '../domain/accounts.repository.interface';
import { UsersModule } from '../../users/infrastructure/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GoogleOAuthUseCase,
    JwtStrategy,
    GoogleStrategy,
    { provide: ISessionsRepository, useClass: SessionsRepository },
    { provide: IAccountsRepository, useClass: AccountsRepository },
  ],
})
export class AuthModule {}
```

- [ ] **Step 8: Import `AuthModule` in `src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseExceptionFilter } from './shared/filters/database-exception.filter';
import { PrismaModule } from './shared/infrastructure/prisma.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { UsersModule } from './modules/users/infrastructure/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Start the server and test auth endpoints via Swagger**

```bash
npm run start:dev
```

Open http://localhost:3000/api. Under `auth`, test:
- `POST /auth/register` — should return 201 with user data
- `POST /auth/login` — should return 200 with `accessToken` and `refreshToken`

Stop with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add src/modules/auth/infrastructure/ src/modules/users/dto/ src/app.module.ts
git commit -m "feat(auth): add JWT/Google strategies, repositories, controller, and module"
```

---

### Task 6: Users Use Cases — Profile & List

**Files:**
- Create: `src/modules/users/application/get-me.use-case.ts` + spec
- Create: `src/modules/users/application/update-me.use-case.ts` + spec
- Create: `src/modules/users/application/list-users.use-case.ts` + spec
- Create: `src/modules/users/dto/update-me.dto.ts`

**Interfaces:**
- Consumes: `IUsersRepository`
- Produces:
  - `GetMeUseCase.execute(userId): Promise<UserEntity>`
  - `UpdateMeUseCase.execute(userId, dto): Promise<UserEntity>`
  - `ListUsersUseCase.execute(params): Promise<PaginatedResult<UserEntity>>`

- [ ] **Step 1: Create `src/modules/users/dto/update-me.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
```

- [ ] **Step 2: Write tests and implement GetMeUseCase**

`src/modules/users/application/get-me.use-case.spec.ts`:
```typescript
import { NotFoundException } from '@nestjs/common';
import { GetMeUseCase } from './get-me.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let repo: jest.Mocked<IUsersRepository>;

  beforeEach(() => {
    repo = { findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    useCase = new GetMeUseCase(repo);
  });

  it('throws NotFoundException when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns user when found', async () => {
    const user = { id: 'user-1' } as UserEntity;
    repo.findById.mockResolvedValue(user);
    await expect(useCase.execute('user-1')).resolves.toBe(user);
  });
});
```

`src/modules/users/application/get-me.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
```

- [ ] **Step 3: Write tests and implement UpdateMeUseCase**

`src/modules/users/application/update-me.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UpdateMeDto } from '../dto/update-me.dto';

@Injectable()
export class UpdateMeUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(userId: string, dto: UpdateMeDto): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.usersRepository.update(userId, dto);
  }
}
```

- [ ] **Step 4: Write tests and implement ListUsersUseCase**

`src/modules/users/application/list-users.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(params: { role?: UserRole; page: number; limit: number }): Promise<PaginatedResult<UserEntity>> {
    return this.usersRepository.findAll(params);
  }
}
```

- [ ] **Step 5: Run use case tests**

```bash
npx jest src/modules/users/application/ --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/users/application/ src/modules/users/dto/
git commit -m "feat(users): add GetMe, UpdateMe, and ListUsers use cases"
```

---

### Task 7: Users Use Cases — Barber Management

**Files:**
- Create: `src/modules/users/application/create-barber.use-case.ts` + spec
- Create: `src/modules/users/application/get-barber.use-case.ts` + spec
- Create: `src/modules/users/application/list-barbers.use-case.ts` + spec
- Create: `src/modules/users/application/update-barber.use-case.ts` + spec
- Create: `src/modules/users/application/delete-barber.use-case.ts` + spec
- Create: `src/modules/users/dto/create-barber.dto.ts`
- Create: `src/modules/users/dto/update-barber.dto.ts`
- Create: `src/modules/users/dto/barber-response.dto.ts`

**Interfaces:**
- Consumes: `IUsersRepository`, `IBarbersRepository`
- Produces: `CreateBarberUseCase`, `GetBarberUseCase`, `ListBarbersUseCase`, `UpdateBarberUseCase`, `DeleteBarberUseCase`

- [ ] **Step 1: Create DTOs**

`src/modules/users/dto/create-barber.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBarberDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() password: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) @IsNumber() @Min(0) @Max(100) commissionPercentage: number;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
}
```

`src/modules/users/dto/update-barber.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateBarberDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 }) @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPercentage?: number;
}
```

`src/modules/users/dto/barber-response.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';
import { BarberEntity } from '../domain/barber.entity';

export class BarberResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() commissionPercentage: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => UserResponseDto }) user: UserResponseDto;
}

export function toBarberResponseDto(barber: BarberEntity): BarberResponseDto {
  return {
    id: barber.id,
    commissionPercentage: barber.commissionPercentage,
    createdAt: barber.createdAt,
    user: {
      id: barber.user.id,
      name: barber.user.name,
      email: barber.user.email,
      phone: barber.user.phone,
      role: barber.user.role,
      loyaltyPoints: barber.user.loyaltyPoints,
      avatarUrl: barber.user.avatarUrl,
      createdAt: barber.user.createdAt,
    },
  };
}
```

- [ ] **Step 2: Implement CreateBarberUseCase**

`src/modules/users/application/create-barber.use-case.ts`:
```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UserRole } from '../domain/user-role.enum';
import { CreateBarberDto } from '../dto/create-barber.dto';

@Injectable()
export class CreateBarberUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(dto: CreateBarberDto): Promise<BarberEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: UserRole.BARBER,
    });

    return this.barbersRepository.create({
      userId: user.id,
      commissionPercentage: dto.commissionPercentage,
    });
  }
}
```

- [ ] **Step 3: Implement remaining barber use cases**

`src/modules/users/application/get-barber.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

@Injectable()
export class GetBarberUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(id: string): Promise<BarberEntity> {
    const barber = await this.barbersRepository.findById(id);
    if (!barber) throw new NotFoundException('Barbeiro não encontrado');
    return barber;
  }
}
```

`src/modules/users/application/list-barbers.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { BarberEntity } from '../domain/barber.entity';

@Injectable()
export class ListBarbersUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(params: { page: number; limit: number }): Promise<PaginatedResult<BarberEntity>> {
    return this.barbersRepository.findAll(params);
  }
}
```

`src/modules/users/application/update-barber.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UpdateBarberDto } from '../dto/update-barber.dto';

@Injectable()
export class UpdateBarberUseCase {
  constructor(
    private readonly usersRepository: { update: (id: string, data: unknown) => Promise<unknown> },
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(id: string, dto: UpdateBarberDto): Promise<BarberEntity> {
    const barber = await this.barbersRepository.findById(id);
    if (!barber) throw new NotFoundException('Barbeiro não encontrado');

    if (dto.name || dto.phone) {
      await this.usersRepository.update(barber.userId, { name: dto.name, phone: dto.phone });
    }
    if (dto.commissionPercentage !== undefined) {
      return this.barbersRepository.update(id, { commissionPercentage: dto.commissionPercentage });
    }
    return this.barbersRepository.findById(id) as Promise<BarberEntity>;
  }
}
```

`src/modules/users/application/delete-barber.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';

@Injectable()
export class DeleteBarberUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(id: string): Promise<void> {
    const barber = await this.barbersRepository.findById(id);
    if (!barber) throw new NotFoundException('Barbeiro não encontrado');
    await this.barbersRepository.softDelete(id);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/modules/users/application/ --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/
git commit -m "feat(users): add barber management use cases"
```

---

### Task 8: StorageService & Avatar Use Cases

**Files:**
- Create: `src/shared/infrastructure/services/storage.service.ts`
- Create: `src/modules/users/application/presign-avatar.use-case.ts` + spec
- Create: `src/modules/users/application/confirm-avatar.use-case.ts` + spec
- Create: `src/modules/users/dto/confirm-avatar.dto.ts`
- Create: `src/modules/users/dto/presign-avatar-response.dto.ts`

**Interfaces:**
- Consumes: `ConfigService`, `IUsersRepository`
- Produces: `StorageService.getPresignedUploadUrl(key, mimeType): Promise<{ url, key }>`, avatar presign/confirm endpoints

- [ ] **Step 1: Install AWS SDK**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Create `src/shared/infrastructure/services/storage.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: configService.get<string>('AWS_ENDPOINT'),
      credentials: {
        accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
    this.bucket = configService.get<string>('AWS_S3_BUCKET')!;
  }

  async getPresignedUploadUrl(key: string, contentType: string): Promise<{ url: string; key: string }> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { url, key };
  }

  getPublicUrl(key: string): string {
    const endpoint = this.configService.get<string>('AWS_ENDPOINT') ?? `https://${this.bucket}.s3.amazonaws.com`;
    return `${endpoint}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
```

- [ ] **Step 3: Create avatar DTOs**

`src/modules/users/dto/presign-avatar-response.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PresignAvatarResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() key: string;
}
```

`src/modules/users/dto/confirm-avatar.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmAvatarDto {
  @ApiProperty() @IsString() storageKey: string;
  @ApiProperty() @IsString() mimeType: string;
}
```

- [ ] **Step 4: Implement `src/modules/users/application/presign-avatar.use-case.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

@Injectable()
export class PresignAvatarUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(userId: string, mimeType: string): Promise<{ url: string; key: string }> {
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;
    return this.storageService.getPresignedUploadUrl(key, mimeType);
  }
}
```

- [ ] **Step 5: Implement `src/modules/users/application/confirm-avatar.use-case.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class ConfirmAvatarUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(userId: string, storageKey: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatarStorageKey) {
      await this.storageService.deleteObject(user.avatarStorageKey).catch(() => null);
    }

    const url = this.storageService.getPublicUrl(storageKey);
    return this.usersRepository.update(userId, { avatarUrl: url, avatarStorageKey: storageKey });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/infrastructure/services/ src/modules/users/application/ src/modules/users/dto/
git commit -m "feat(users): add StorageService and avatar presign/confirm use cases"
```

---

### Task 9: Users Infrastructure — Repositories, Controller, Module & Seed

**Files:**
- Create: `src/modules/users/infrastructure/users.repository.ts`
- Create: `src/modules/users/infrastructure/barbers.repository.ts`
- Create: `src/modules/users/infrastructure/users.controller.ts`
- Create: `src/modules/users/infrastructure/users.module.ts`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed script)

**Interfaces:**
- Produces: all `/users/*` endpoints live; UsersModule exported and importable by AuthModule

- [ ] **Step 1: Create `src/modules/users/infrastructure/users.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string; phone: string | null; passwordHash: string | null; role: UserRole }): Promise<UserEntity> {
    const record = await this.prisma.user.create({ data });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({ where: { id, disabledAt: null } });
    return record ? this.toEntity(record) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({ where: { email, disabledAt: null } });
    return record ? this.toEntity(record) : null;
  }

  async update(id: string, data: Partial<{ name: string; phone: string | null; avatarUrl: string | null; avatarStorageKey: string | null }>): Promise<UserEntity> {
    const record = await this.prisma.user.update({ where: { id }, data });
    return this.toEntity(record);
  }

  async updateLoyaltyPoints(id: string, delta: number): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { loyaltyPoints: { increment: delta } } });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  async findAll(params: { role?: UserRole; page: number; limit: number }): Promise<PaginatedResult<UserEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where: Prisma.UserWhereInput = { disabledAt: null };
    if (params.role) where.role = params.role;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  private toEntity(record: User): UserEntity {
    const e = new UserEntity();
    e.id = record.id;
    e.name = record.name;
    e.email = record.email;
    e.phone = record.phone;
    e.role = record.role as UserRole;
    e.loyaltyPoints = record.loyaltyPoints;
    e.avatarUrl = record.avatarUrl;
    e.avatarStorageKey = record.avatarStorageKey;
    e.createdAt = record.createdAt;
    e.disabledAt = record.disabledAt;
    return e;
  }
}
```

- [ ] **Step 2: Create `src/modules/users/infrastructure/barbers.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Barber, User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

type BarberWithUser = Barber & { user: User };

@Injectable()
export class BarbersRepository implements IBarbersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { userId: string; commissionPercentage: number }): Promise<BarberEntity> {
    const record = await this.prisma.barber.create({
      data: { userId: data.userId, commissionPercentage: data.commissionPercentage },
      include: { user: true },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<BarberEntity | null> {
    const record = await this.prisma.barber.findFirst({
      where: { id, disabledAt: null },
      include: { user: true },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByUserId(userId: string): Promise<BarberEntity | null> {
    const record = await this.prisma.barber.findFirst({
      where: { userId, disabledAt: null },
      include: { user: true },
    });
    return record ? this.toEntity(record) : null;
  }

  async findAll(params: { page: number; limit: number }): Promise<PaginatedResult<BarberEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where = { disabledAt: null };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.barber.findMany({ where, skip, take, include: { user: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.barber.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async update(id: string, data: Partial<{ commissionPercentage: number }>): Promise<BarberEntity> {
    const record = await this.prisma.barber.update({
      where: { id },
      data,
      include: { user: true },
    });
    return this.toEntity(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.barber.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(record: BarberWithUser): BarberEntity {
    const e = new BarberEntity();
    e.id = record.id;
    e.userId = record.userId;
    e.commissionPercentage = Number(record.commissionPercentage);
    e.createdAt = record.createdAt;
    e.disabledAt = record.disabledAt;
    e.user = Object.assign(new UserEntity(), {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      phone: record.user.phone,
      role: record.user.role as UserRole,
      loyaltyPoints: record.user.loyaltyPoints,
      avatarUrl: record.user.avatarUrl,
      avatarStorageKey: record.user.avatarStorageKey,
      createdAt: record.user.createdAt,
      disabledAt: record.user.disabledAt,
    });
    return e;
  }
}
```

- [ ] **Step 3: Create `src/modules/users/infrastructure/users.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { UserRole } from '../domain/user-role.enum';
import { GetMeUseCase } from '../application/get-me.use-case';
import { UpdateMeUseCase } from '../application/update-me.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { CreateBarberUseCase } from '../application/create-barber.use-case';
import { GetBarberUseCase } from '../application/get-barber.use-case';
import { ListBarbersUseCase } from '../application/list-barbers.use-case';
import { UpdateBarberUseCase } from '../application/update-barber.use-case';
import { DeleteBarberUseCase } from '../application/delete-barber.use-case';
import { PresignAvatarUseCase } from '../application/presign-avatar.use-case';
import { ConfirmAvatarUseCase } from '../application/confirm-avatar.use-case';
import { UpdateMeDto } from '../dto/update-me.dto';
import { CreateBarberDto } from '../dto/create-barber.dto';
import { UpdateBarberDto } from '../dto/update-barber.dto';
import { ConfirmAvatarDto } from '../dto/confirm-avatar.dto';
import { UserResponseDto, toUserResponseDto } from '../dto/user-response.dto';
import { BarberResponseDto, toBarberResponseDto } from '../dto/barber-response.dto';
import { PresignAvatarResponseDto } from '../dto/presign-avatar-response.dto';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createBarberUseCase: CreateBarberUseCase,
    private readonly getBarberUseCase: GetBarberUseCase,
    private readonly listBarbersUseCase: ListBarbersUseCase,
    private readonly updateBarberUseCase: UpdateBarberUseCase,
    private readonly deleteBarberUseCase: DeleteBarberUseCase,
    private readonly presignAvatarUseCase: PresignAvatarUseCase,
    private readonly confirmAvatarUseCase: ConfirmAvatarUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getMe(@CurrentUser() user: { id: string }): Promise<UserResponseDto> {
    return toUserResponseDto(await this.getMeUseCase.execute(user.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateMeDto): Promise<UserResponseDto> {
    return toUserResponseDto(await this.updateMeUseCase.execute(user.id, dto));
  }

  @Post('me/avatar/presign')
  @ApiOperation({ summary: 'Get presigned URL for avatar upload' })
  @ApiResponse({ status: 201, type: PresignAvatarResponseDto })
  async presignAvatar(
    @CurrentUser() user: { id: string },
    @Body('mimeType') mimeType: string,
  ): Promise<PresignAvatarResponseDto> {
    return this.presignAvatarUseCase.execute(user.id, mimeType);
  }

  @Patch('me/avatar/confirm')
  @ApiOperation({ summary: 'Confirm avatar after S3 upload' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async confirmAvatar(@CurrentUser() user: { id: string }, @Body() dto: ConfirmAvatarDto): Promise<UserResponseDto> {
    return toUserResponseDto(await this.confirmAvatarUseCase.execute(user.id, dto.storageKey));
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200 })
  async listUsers(@Query() query: PaginationQueryDto & { role?: UserRole }): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.listUsersUseCase.execute({ role: query.role, page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toUserResponseDto) };
  }

  @Post('barbers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a barber account' })
  @ApiResponse({ status: 201, type: BarberResponseDto })
  async createBarber(@Body() dto: CreateBarberDto): Promise<BarberResponseDto> {
    return toBarberResponseDto(await this.createBarberUseCase.execute(dto));
  }

  @Get('barbers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List barbers' })
  @ApiResponse({ status: 200 })
  async listBarbers(@Query() query: PaginationQueryDto): Promise<PaginatedResult<BarberResponseDto>> {
    const result = await this.listBarbersUseCase.execute({ page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toBarberResponseDto) };
  }

  @Get('barbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get barber by id' })
  @ApiResponse({ status: 200, type: BarberResponseDto })
  async getBarber(@Param('id') id: string): Promise<BarberResponseDto> {
    return toBarberResponseDto(await this.getBarberUseCase.execute(id));
  }

  @Patch('barbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update barber' })
  @ApiResponse({ status: 200, type: BarberResponseDto })
  async updateBarber(@Param('id') id: string, @Body() dto: UpdateBarberDto): Promise<BarberResponseDto> {
    return toBarberResponseDto(await this.updateBarberUseCase.execute(id, dto));
  }

  @Delete('barbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Soft-delete a barber' })
  @ApiResponse({ status: 200 })
  async deleteBarber(@Param('id') id: string): Promise<void> {
    await this.deleteBarberUseCase.execute(id);
  }
}
```

- [ ] **Step 4: Create `src/modules/users/infrastructure/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { GetMeUseCase } from '../application/get-me.use-case';
import { UpdateMeUseCase } from '../application/update-me.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { CreateBarberUseCase } from '../application/create-barber.use-case';
import { GetBarberUseCase } from '../application/get-barber.use-case';
import { ListBarbersUseCase } from '../application/list-barbers.use-case';
import { UpdateBarberUseCase } from '../application/update-barber.use-case';
import { DeleteBarberUseCase } from '../application/delete-barber.use-case';
import { PresignAvatarUseCase } from '../application/presign-avatar.use-case';
import { ConfirmAvatarUseCase } from '../application/confirm-avatar.use-case';
import { UsersRepository } from './users.repository';
import { BarbersRepository } from './barbers.repository';
import { UsersController } from './users.controller';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: IUsersRepository, useClass: UsersRepository },
    { provide: IBarbersRepository, useClass: BarbersRepository },
    StorageService,
    GetMeUseCase,
    UpdateMeUseCase,
    ListUsersUseCase,
    CreateBarberUseCase,
    GetBarberUseCase,
    ListBarbersUseCase,
    UpdateBarberUseCase,
    DeleteBarberUseCase,
    PresignAvatarUseCase,
    ConfirmAvatarUseCase,
  ],
  exports: [IUsersRepository, IBarbersRepository, StorageService],
})
export class UsersModule {}
```

- [ ] **Step 5: Create `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL ?? 'owner@barbershop.com';
  const password = process.env.OWNER_PASSWORD ?? 'changeme123';

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log('Owner already exists — skipping seed');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name: 'Owner', email, phone: null, passwordHash, role: 'OWNER' },
  });

  console.log(`Owner created: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Add seed script to `package.json`**

Add inside the `"prisma"` section (create it if needed) in `package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

- [ ] **Step 7: Run the seed**

```bash
npx prisma db seed
```

Expected: `Owner created: owner@barbershop.com`

- [ ] **Step 8: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/modules/users/infrastructure/ prisma/seed.ts package.json
git commit -m "feat(users): add repositories, controller, module, and owner seed script"
```
