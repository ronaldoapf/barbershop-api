# Barbershop API — Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full appointment lifecycle: booking (with conflict detection, loyalty redemption, price snapshots), status transitions (PENDING → CONFIRMED → IN_PROGRESS → COMPLETED / CANCELLED / NO_SHOW), and loyalty point earning on completion.

**Architecture:** `appointments` module. Cross-module side effects (loyalty crediting, notification triggers) are emitted as `EventEmitter2` events so appointments never imports the notifications or users modules. After Plan 5, the `AppointmentsOccupiedWindowsProvider` replaces the stub in the `schedules` module.

**Tech Stack:** NestJS 11, Prisma 7, @nestjs/event-emitter, class-validator, @nestjs/swagger

**Prerequisite:** Plans 1–4 must be complete.

## Global Constraints

- Package manager: npm only
- All source code in English; user-facing messages in pt-BR
- Soft deletes mandatory; reads filter `disabledAt: null`
- Never read `process.env` directly
- Prices stored as integer cents — all money fields are integers
- Price snapshot: capture `priceSnapshot` and `pointsEarnedSnapshot` from service/package at booking time
- Cancellation allowed only within window set by `cancellation_window_hours` setting (read from DB, default 24)
- Loyalty check: `settings.loyalty_enabled === "true"` and `user.loyaltyPoints >= service.pointsRequired`

---

## File Structure

```
src/modules/appointments/
  application/
    book-appointment.use-case.ts + spec
    confirm-appointment.use-case.ts + spec
    start-appointment.use-case.ts + spec
    complete-appointment.use-case.ts + spec
    cancel-appointment.use-case.ts + spec
    no-show-appointment.use-case.ts + spec
    list-appointments.use-case.ts + spec
    get-appointment.use-case.ts + spec
    appointments-occupied-windows.provider.ts  ← implements IOccupiedWindowsProvider
  domain/
    appointment.entity.ts
    appointment-service.entity.ts
    appointment-status.enum.ts
    loyalty-transaction.entity.ts
    loyalty-transaction-type.enum.ts
    appointments.repository.interface.ts
    settings.provider.interface.ts   ← for reading settings without importing settings module
  dto/
    book-appointment.dto.ts
    appointment-response.dto.ts
    list-appointments-query.dto.ts
  infrastructure/
    appointments.repository.ts
    appointments.controller.ts
    appointments.module.ts
```

---

### Task 1: Domain

**Files:** All `domain/` files

**Interfaces:**
- Produces: `AppointmentEntity`, `AppointmentServiceEntity`, `AppointmentStatus`, `LoyaltyTransactionEntity`, `LoyaltyTransactionType`, `IAppointmentsRepository`, `ISettingsProvider`

- [ ] **Step 1: Create `src/modules/appointments/domain/appointment-status.enum.ts`**

```typescript
export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}
```

- [ ] **Step 2: Create `src/modules/appointments/domain/loyalty-transaction-type.enum.ts`**

```typescript
export enum LoyaltyTransactionType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
}
```

- [ ] **Step 3: Create `src/modules/appointments/domain/appointment-service.entity.ts`**

```typescript
export class AppointmentServiceEntity {
  id: string;
  appointmentId: string;
  serviceId: string | null;
  packageId: string | null;
  serviceName: string;         // snapshot
  priceSnapshot: number;       // snapshot in cents
  durationMinutes: number;     // snapshot
  pointsEarnedSnapshot: number; // snapshot of pointsEarned
  redeemedWithPoints: boolean;
  createdAt: Date;
}
```

- [ ] **Step 4: Create `src/modules/appointments/domain/appointment.entity.ts`**

```typescript
import { AppointmentStatus } from './appointment-status.enum';
import { AppointmentServiceEntity } from './appointment-service.entity';

export class AppointmentEntity {
  id: string;
  customerId: string;
  barberId: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date | null;
  totalAmount: number;  // cents, snapshot sum at booking
  notes: string | null;
  services: AppointmentServiceEntity[];
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 5: Create `src/modules/appointments/domain/loyalty-transaction.entity.ts`**

```typescript
import { LoyaltyTransactionType } from './loyalty-transaction-type.enum';

export class LoyaltyTransactionEntity {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: LoyaltyTransactionType;
  points: number;
  createdAt: Date;
}
```

- [ ] **Step 6: Create `src/modules/appointments/domain/settings.provider.interface.ts`**

```typescript
export abstract class ISettingsProvider {
  abstract getValue(key: string): Promise<string | null>;
}
```

- [ ] **Step 7: Create `src/modules/appointments/domain/appointments.repository.interface.ts`**

```typescript
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { AppointmentEntity } from './appointment.entity';
import { AppointmentStatus } from './appointment-status.enum';

export abstract class IAppointmentsRepository {
  abstract create(data: {
    customerId: string;
    barberId: string;
    startsAt: Date;
    totalAmount: number;
    notes: string | null;
    services: Array<{
      serviceId: string | null;
      packageId: string | null;
      serviceName: string;
      priceSnapshot: number;
      durationMinutes: number;
      pointsEarnedSnapshot: number;
      redeemedWithPoints: boolean;
    }>;
  }): Promise<AppointmentEntity>;

  abstract findById(id: string): Promise<AppointmentEntity | null>;

  abstract findAll(params: {
    customerId?: string;
    barberId?: string;
    status?: AppointmentStatus;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<AppointmentEntity>>;

  abstract updateStatus(id: string, status: AppointmentStatus, endsAt?: Date): Promise<AppointmentEntity>;

  abstract getOccupiedWindows(barberId: string, date: string): Promise<Array<{ start: number; end: number }>>;

  abstract creditLoyaltyPoints(userId: string, appointmentId: string, points: number): Promise<void>;

  abstract deductLoyaltyPoints(userId: string, appointmentId: string, points: number): Promise<void>;
}
```

`getOccupiedWindows` returns minutes-since-midnight pairs for all non-cancelled appointments for the barber on that date.

`creditLoyaltyPoints` and `deductLoyaltyPoints` both update `User.loyaltyPoints` and insert a `LoyaltyTransaction` in a single `$transaction`.

- [ ] **Step 8: Commit**

```bash
git add src/modules/appointments/domain/
git commit -m "feat(appointments): add domain entities and repository interface"
```

---

### Task 2: DTOs

**Files:** All `dto/` files

- [ ] **Step 1: Create `src/modules/appointments/dto/book-appointment.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BookAppointmentServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() packageId?: string;
  @ApiProperty({ description: 'Set true for one service to redeem loyalty points instead of paying' })
  @IsOptional() redeemedWithPoints?: boolean;
}

export class BookAppointmentDto {
  @ApiProperty() @IsUUID() barberId: string;
  @ApiProperty() @IsDateString() startsAt: string;
  @ApiProperty({ type: [BookAppointmentServiceDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => BookAppointmentServiceDto)
  services: BookAppointmentServiceDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
```

- [ ] **Step 2: Create `src/modules/appointments/dto/appointment-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentServiceEntity } from '../domain/appointment-service.entity';

export class AppointmentServiceResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() serviceId: string | null;
  @ApiPropertyOptional() packageId: string | null;
  @ApiProperty() serviceName: string;
  @ApiProperty() priceSnapshot: number;
  @ApiProperty() durationMinutes: number;
  @ApiProperty() pointsEarnedSnapshot: number;
  @ApiProperty() redeemedWithPoints: boolean;
}

export class AppointmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() customerId: string;
  @ApiProperty() barberId: string;
  @ApiProperty({ enum: AppointmentStatus }) status: AppointmentStatus;
  @ApiProperty() startsAt: Date;
  @ApiPropertyOptional() endsAt: Date | null;
  @ApiProperty() totalAmount: number;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty({ type: [AppointmentServiceResponseDto] }) services: AppointmentServiceResponseDto[];
  @ApiProperty() createdAt: Date;
}

function toServiceDto(e: AppointmentServiceEntity): AppointmentServiceResponseDto {
  return { id: e.id, serviceId: e.serviceId, packageId: e.packageId, serviceName: e.serviceName, priceSnapshot: e.priceSnapshot, durationMinutes: e.durationMinutes, pointsEarnedSnapshot: e.pointsEarnedSnapshot, redeemedWithPoints: e.redeemedWithPoints };
}

export function toAppointmentResponseDto(e: AppointmentEntity): AppointmentResponseDto {
  return { id: e.id, customerId: e.customerId, barberId: e.barberId, status: e.status, startsAt: e.startsAt, endsAt: e.endsAt, totalAmount: e.totalAmount, notes: e.notes ?? null, services: e.services.map(toServiceDto), createdAt: e.createdAt };
}
```

- [ ] **Step 3: Create `src/modules/appointments/dto/list-appointments-query.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';

export class ListAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() barberId?: string;
  @ApiPropertyOptional({ enum: AppointmentStatus }) @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/appointments/dto/
git commit -m "feat(appointments): add appointment DTOs"
```

---

### Task 3: Use Cases — Booking

**Files:** `book-appointment.use-case.ts` + spec

This is the most complex use case. It must:
1. Load all requested services/packages by ID and validate they exist and are ACTIVE
2. Check loyalty eligibility for any `redeemedWithPoints=true` item
3. Detect scheduling conflicts (call `appointmentsRepository.getOccupiedWindows`)
4. Create appointment with price snapshots; `totalAmount = sum of priceSnapshot` (redeemed services count as 0)
5. Deduct loyalty points for redeemed service
6. Emit `appointment.booked` event with `{ appointmentId, customerId, barberId, startsAt }`

- [ ] **Step 1: Write failing tests**

`src/modules/appointments/application/book-appointment.use-case.spec.ts`:
```typescript
import { BookAppointmentUseCase } from './book-appointment.use-case';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { ISettingsProvider } from '../domain/settings.provider.interface';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { IPackagesRepository } from '../../services/domain/packages.repository.interface';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';

const mockAppointmentsRepo = (): jest.Mocked<IAppointmentsRepository> => ({
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  updateStatus: jest.fn(), getOccupiedWindows: jest.fn(),
  creditLoyaltyPoints: jest.fn(), deductLoyaltyPoints: jest.fn(),
});
const mockServicesRepo = (): jest.Mocked<IServicesRepository> => ({
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), updateStatus: jest.fn(), softDelete: jest.fn(),
});
const mockPackagesRepo = (): jest.Mocked<IPackagesRepository> => ({
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), updateStatus: jest.fn(), softDelete: jest.fn(),
});
const mockUsersRepo = (): jest.Mocked<IUsersRepository> => ({
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
});
const mockSettings = (): jest.Mocked<ISettingsProvider> => ({ getValue: jest.fn() });
const mockEmitter = (): jest.Mocked<EventEmitter2> => ({ emit: jest.fn() } as any);

const activeService = { id: 'svc1', name: 'Haircut', price: 5000, durationMinutes: 30, status: ItemStatus.ACTIVE, pointsEarned: 10, pointsRequired: 100 };
const customer = { id: 'cust1', loyaltyPoints: 0 };

describe('BookAppointmentUseCase', () => {
  it('throws NotFoundException when service not found', async () => {
    const svcRepo = mockServicesRepo();
    svcRepo.findById.mockResolvedValue(null);
    const uc = new BookAppointmentUseCase(mockAppointmentsRepo(), svcRepo, mockPackagesRepo(), mockUsersRepo(), mockSettings(), mockEmitter());
    await expect(uc.execute('cust1', { barberId: 'b1', startsAt: '2026-07-01T09:00:00Z', services: [{ serviceId: 'svc1' }] })).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for INACTIVE service', async () => {
    const svcRepo = mockServicesRepo();
    svcRepo.findById.mockResolvedValue({ ...activeService, status: ItemStatus.INACTIVE } as any);
    const uc = new BookAppointmentUseCase(mockAppointmentsRepo(), svcRepo, mockPackagesRepo(), mockUsersRepo(), mockSettings(), mockEmitter());
    await expect(uc.execute('cust1', { barberId: 'b1', startsAt: '2026-07-01T09:00:00Z', services: [{ serviceId: 'svc1' }] })).rejects.toThrow(BadRequestException);
  });

  it('throws UnprocessableEntityException when loyalty not enabled but redeemedWithPoints=true', async () => {
    const svcRepo = mockServicesRepo();
    svcRepo.findById.mockResolvedValue(activeService as any);
    const settings = mockSettings();
    settings.getValue.mockResolvedValue('false');
    const usersRepo = mockUsersRepo();
    usersRepo.findById.mockResolvedValue({ ...customer } as any);
    const apptRepo = mockAppointmentsRepo();
    apptRepo.getOccupiedWindows.mockResolvedValue([]);
    const uc = new BookAppointmentUseCase(apptRepo, svcRepo, mockPackagesRepo(), usersRepo, settings, mockEmitter());
    await expect(uc.execute('cust1', { barberId: 'b1', startsAt: '2026-07-01T09:00:00Z', services: [{ serviceId: 'svc1', redeemedWithPoints: true }] })).rejects.toThrow(UnprocessableEntityException);
  });

  it('books appointment and emits event', async () => {
    const svcRepo = mockServicesRepo();
    svcRepo.findById.mockResolvedValue(activeService as any);
    const settings = mockSettings();
    settings.getValue.mockResolvedValue(null); // loyalty disabled
    const apptRepo = mockAppointmentsRepo();
    apptRepo.getOccupiedWindows.mockResolvedValue([]);
    apptRepo.create.mockResolvedValue({ id: 'appt1', status: AppointmentStatus.PENDING, services: [] } as any);
    const usersRepo = mockUsersRepo();
    usersRepo.findById.mockResolvedValue({ ...customer } as any);
    const emitter = mockEmitter();
    const uc = new BookAppointmentUseCase(apptRepo, svcRepo, mockPackagesRepo(), usersRepo, settings, emitter);
    await uc.execute('cust1', { barberId: 'b1', startsAt: '2026-07-01T09:00:00Z', services: [{ serviceId: 'svc1' }] });
    expect(apptRepo.create).toHaveBeenCalled();
    expect(emitter.emit).toHaveBeenCalledWith('appointment.booked', expect.objectContaining({ appointmentId: 'appt1' }));
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

```bash
npx jest src/modules/appointments/application/book-appointment.use-case.spec.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement BookAppointmentUseCase**

`src/modules/appointments/application/book-appointment.use-case.ts`:
```typescript
import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectEventEmitter } from '@nestjs/event-emitter';
import { EventEmitter2 } from 'eventemitter2';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { ISettingsProvider } from '../domain/settings.provider.interface';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { IPackagesRepository } from '../../services/domain/packages.repository.interface';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { BookAppointmentDto, BookAppointmentServiceDto } from '../dto/book-appointment.dto';

@Injectable()
export class BookAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly servicesRepository: IServicesRepository,
    private readonly packagesRepository: IPackagesRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly settingsProvider: ISettingsProvider,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
  ) {}

  async execute(customerId: string, dto: BookAppointmentDto): Promise<AppointmentEntity> {
    // 1. Resolve all requested items
    const resolvedItems = await Promise.all(dto.services.map((s) => this.resolveItem(s)));

    // 2. Loyalty check for redeemed items
    const redeemedItems = resolvedItems.filter((_, i) => dto.services[i].redeemedWithPoints);
    if (redeemedItems.length > 0) {
      const loyaltyEnabled = (await this.settingsProvider.getValue('loyalty_enabled')) === 'true';
      if (!loyaltyEnabled) throw new UnprocessableEntityException('Sistema de fidelidade está desabilitado');

      const customer = await this.usersRepository.findById(customerId);
      if (!customer) throw new NotFoundException('Cliente não encontrado');

      const totalRequired = redeemedItems.reduce((sum, item) => sum + item.pointsRequired, 0);
      if (customer.loyaltyPoints < totalRequired) {
        throw new UnprocessableEntityException('Pontos insuficientes para resgate');
      }
    }

    // 3. Conflict detection
    const startsAt = new Date(dto.startsAt);
    const date = dto.startsAt.substring(0, 10);
    const totalDuration = resolvedItems.reduce((sum, item) => sum + item.durationMinutes, 0);
    const endsAtMinutes = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes() + totalDuration;
    const occupied = await this.appointmentsRepository.getOccupiedWindows(dto.barberId, date);
    const startMinutes = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
    const hasConflict = occupied.some((w) => w.start < endsAtMinutes && w.end > startMinutes);
    if (hasConflict) throw new UnprocessableEntityException('Horário já está ocupado');

    // 4. Build service records with snapshots
    const serviceRecords = resolvedItems.map((item, i) => ({
      serviceId: dto.services[i].serviceId ?? null,
      packageId: dto.services[i].packageId ?? null,
      serviceName: item.name,
      priceSnapshot: dto.services[i].redeemedWithPoints ? 0 : item.price,
      durationMinutes: item.durationMinutes,
      pointsEarnedSnapshot: item.pointsEarned,
      redeemedWithPoints: !!dto.services[i].redeemedWithPoints,
    }));

    const totalAmount = serviceRecords.reduce((sum, s) => sum + s.priceSnapshot, 0);

    // 5. Persist
    const appointment = await this.appointmentsRepository.create({
      customerId,
      barberId: dto.barberId,
      startsAt,
      totalAmount,
      notes: dto.notes ?? null,
      services: serviceRecords,
    });

    // 6. Deduct loyalty points for redeemed items
    if (redeemedItems.length > 0) {
      const totalRequired = redeemedItems.reduce((sum, item) => sum + item.pointsRequired, 0);
      await this.appointmentsRepository.deductLoyaltyPoints(customerId, appointment.id, totalRequired);
    }

    // 7. Emit event
    this.emitter.emit('appointment.booked', { appointmentId: appointment.id, customerId, barberId: dto.barberId, startsAt });

    return appointment;
  }

  private async resolveItem(s: BookAppointmentServiceDto) {
    if (s.serviceId) {
      const svc = await this.servicesRepository.findById(s.serviceId);
      if (!svc) throw new NotFoundException(`Serviço ${s.serviceId} não encontrado`);
      if (svc.status !== ItemStatus.ACTIVE) throw new BadRequestException(`Serviço ${svc.name} não está disponível`);
      return { name: svc.name, price: svc.price, durationMinutes: svc.durationMinutes, pointsEarned: svc.pointsEarned, pointsRequired: svc.pointsRequired };
    }
    if (s.packageId) {
      const pkg = await this.packagesRepository.findById(s.packageId);
      if (!pkg) throw new NotFoundException(`Pacote ${s.packageId} não encontrado`);
      if (pkg.status !== ItemStatus.ACTIVE) throw new BadRequestException(`Pacote ${pkg.name} não está disponível`);
      const duration = pkg.services.reduce((sum, svc) => sum + svc.durationMinutes, 0);
      return { name: pkg.name, price: pkg.price, durationMinutes: duration, pointsEarned: pkg.pointsEarned, pointsRequired: pkg.pointsRequired };
    }
    throw new BadRequestException('Cada item deve ter serviceId ou packageId');
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest src/modules/appointments/application/book-appointment.use-case.spec.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/appointments/application/book-appointment.use-case.ts src/modules/appointments/application/book-appointment.use-case.spec.ts
git commit -m "feat(appointments): implement booking use case with conflict detection and loyalty"
```

---

### Task 4: Use Cases — Status Transitions

**Files:** All remaining use cases + specs

**Rules:**
- `confirm`: PENDING → CONFIRMED (OWNER or BARBER)
- `start`: CONFIRMED → IN_PROGRESS (OWNER or BARBER)
- `complete`: IN_PROGRESS → COMPLETED; credit earned loyalty points; emit `appointment.completed`
- `cancel`: PENDING|CONFIRMED → CANCELLED (customer within window, or OWNER/BARBER any time); emit `appointment.cancelled`
- `no-show`: CONFIRMED → NO_SHOW (OWNER or BARBER)
- All transitions throw `UnprocessableEntityException` on invalid state

- [ ] **Step 1: Implement confirm, start, no-show use cases**

`src/modules/appointments/application/confirm-appointment.use-case.ts`:
```typescript
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';

@Injectable()
export class ConfirmAppointmentUseCase {
  constructor(private readonly appointmentsRepository: IAppointmentsRepository) {}
  async execute(id: string): Promise<AppointmentEntity> {
    const appt = await this.appointmentsRepository.findById(id);
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    if (appt.status !== AppointmentStatus.PENDING) throw new UnprocessableEntityException('Apenas agendamentos pendentes podem ser confirmados');
    return this.appointmentsRepository.updateStatus(id, AppointmentStatus.CONFIRMED);
  }
}
```

`src/modules/appointments/application/start-appointment.use-case.ts`:
```typescript
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';

@Injectable()
export class StartAppointmentUseCase {
  constructor(private readonly appointmentsRepository: IAppointmentsRepository) {}
  async execute(id: string): Promise<AppointmentEntity> {
    const appt = await this.appointmentsRepository.findById(id);
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    if (appt.status !== AppointmentStatus.CONFIRMED) throw new UnprocessableEntityException('Apenas agendamentos confirmados podem ser iniciados');
    return this.appointmentsRepository.updateStatus(id, AppointmentStatus.IN_PROGRESS);
  }
}
```

`src/modules/appointments/application/no-show-appointment.use-case.ts`:
```typescript
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';

@Injectable()
export class NoShowAppointmentUseCase {
  constructor(private readonly appointmentsRepository: IAppointmentsRepository) {}
  async execute(id: string): Promise<AppointmentEntity> {
    const appt = await this.appointmentsRepository.findById(id);
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    if (appt.status !== AppointmentStatus.CONFIRMED) throw new UnprocessableEntityException('Apenas agendamentos confirmados podem ser marcados como não comparecimento');
    return this.appointmentsRepository.updateStatus(id, AppointmentStatus.NO_SHOW);
  }
}
```

- [ ] **Step 2: Implement CompleteAppointmentUseCase**

`src/modules/appointments/application/complete-appointment.use-case.ts`:
```typescript
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectEventEmitter } from '@nestjs/event-emitter';
import { EventEmitter2 } from 'eventemitter2';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { ISettingsProvider } from '../domain/settings.provider.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';

@Injectable()
export class CompleteAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly settingsProvider: ISettingsProvider,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
  ) {}

  async execute(id: string): Promise<AppointmentEntity> {
    const appt = await this.appointmentsRepository.findById(id);
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    if (appt.status !== AppointmentStatus.IN_PROGRESS) throw new UnprocessableEntityException('Apenas agendamentos em andamento podem ser concluídos');

    const completed = await this.appointmentsRepository.updateStatus(id, AppointmentStatus.COMPLETED, new Date());

    // Credit loyalty points if enabled
    const loyaltyEnabled = (await this.settingsProvider.getValue('loyalty_enabled')) === 'true';
    if (loyaltyEnabled) {
      const totalEarned = appt.services
        .filter((s) => !s.redeemedWithPoints)
        .reduce((sum, s) => sum + s.pointsEarnedSnapshot, 0);
      if (totalEarned > 0) {
        await this.appointmentsRepository.creditLoyaltyPoints(appt.customerId, id, totalEarned);
      }
    }

    this.emitter.emit('appointment.completed', { appointmentId: id, customerId: appt.customerId, barberId: appt.barberId });
    return completed;
  }
}
```

- [ ] **Step 3: Implement CancelAppointmentUseCase**

`src/modules/appointments/application/cancel-appointment.use-case.ts`:
```typescript
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectEventEmitter } from '@nestjs/event-emitter';
import { EventEmitter2 } from 'eventemitter2';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { ISettingsProvider } from '../domain/settings.provider.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { UserRole } from '../../users/domain/user-role.enum';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly settingsProvider: ISettingsProvider,
    @InjectEventEmitter() private readonly emitter: EventEmitter2,
  ) {}

  async execute(id: string, requesterId: string, requesterRole: UserRole): Promise<AppointmentEntity> {
    const appt = await this.appointmentsRepository.findById(id);
    if (!appt) throw new NotFoundException('Agendamento não encontrado');

    const cancellable = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
    if (!cancellable.includes(appt.status)) throw new UnprocessableEntityException('Agendamento não pode ser cancelado neste estado');

    const isStaff = requesterRole === UserRole.OWNER || requesterRole === UserRole.BARBER;
    if (!isStaff) {
      if (appt.customerId !== requesterId) throw new ForbiddenException('Sem permissão para cancelar este agendamento');
      const windowHours = parseInt((await this.settingsProvider.getValue('cancellation_window_hours')) ?? '24', 10);
      const cutoff = new Date(appt.startsAt.getTime() - windowHours * 3600 * 1000);
      if (new Date() > cutoff) throw new UnprocessableEntityException('Janela de cancelamento encerrada');
    }

    const cancelled = await this.appointmentsRepository.updateStatus(id, AppointmentStatus.CANCELLED);
    this.emitter.emit('appointment.cancelled', { appointmentId: id, customerId: appt.customerId, barberId: appt.barberId });
    return cancelled;
  }
}
```

- [ ] **Step 4: Implement list and get use cases**

`src/modules/appointments/application/list-appointments.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { AppointmentEntity } from '../domain/appointment.entity';

@Injectable()
export class ListAppointmentsUseCase {
  constructor(private readonly appointmentsRepository: IAppointmentsRepository) {}
  async execute(params: { customerId?: string; barberId?: string; status?: AppointmentStatus; from?: Date; to?: Date; page: number; limit: number }): Promise<PaginatedResult<AppointmentEntity>> {
    return this.appointmentsRepository.findAll(params);
  }
}
```

`src/modules/appointments/application/get-appointment.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentEntity } from '../domain/appointment.entity';

@Injectable()
export class GetAppointmentUseCase {
  constructor(private readonly appointmentsRepository: IAppointmentsRepository) {}
  async execute(id: string): Promise<AppointmentEntity> {
    const appt = await this.appointmentsRepository.findById(id);
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    return appt;
  }
}
```

- [ ] **Step 5: Run all use case tests**

```bash
npx jest src/modules/appointments/application/ --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/appointments/application/
git commit -m "feat(appointments): add status transition and list/get use cases"
```

---

### Task 5: AppointmentsOccupiedWindowsProvider

**Files:** `src/modules/appointments/application/appointments-occupied-windows.provider.ts`

This class implements `IOccupiedWindowsProvider` from the schedules domain so the slot-generation algorithm can check real conflicts.

- [ ] **Step 1: Implement the provider**

`src/modules/appointments/application/appointments-occupied-windows.provider.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IOccupiedWindowsProvider } from '../../schedules/domain/occupied-windows-provider.interface';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

@Injectable()
export class AppointmentsOccupiedWindowsProvider implements IOccupiedWindowsProvider {
  constructor(private readonly appointmentsRepository: IAppointmentsRepository) {}
  async getOccupiedWindows(barberId: string, date: string): Promise<Array<{ start: number; end: number }>> {
    return this.appointmentsRepository.getOccupiedWindows(barberId, date);
  }
}
```

- [ ] **Step 2: Wire into AppModule**

In `src/app.module.ts`, after both `AppointmentsModule` and `SchedulesModule` are imported, override the `IOccupiedWindowsProvider` binding for the schedules module by exporting `AppointmentsOccupiedWindowsProvider` from `AppointmentsModule` and importing `AppointmentsModule` into `SchedulesModule` — OR use a simpler global override:

In `AppointmentsModule`, export `AppointmentsOccupiedWindowsProvider`. Update `SchedulesModule` to accept `IOccupiedWindowsProvider` as an optional external override: import `AppointmentsModule` in `SchedulesModule` and change the provider binding:

```typescript
// In schedules.module.ts, replace NullOccupiedWindowsProvider with:
{ provide: IOccupiedWindowsProvider, useClass: AppointmentsOccupiedWindowsProvider },
```

And import `AppointmentsModule` into `SchedulesModule`. To break the circular dependency (`AppointmentsModule` → `SchedulesModule` for `IBarberWorkingHoursRepository`), use `forwardRef`:

```typescript
// In schedules.module.ts
imports: [forwardRef(() => AppointmentsModule)],
exports: [IBarberWorkingHoursRepository, IOccupiedWindowsProvider, IBarberWorkingHoursRepository],

// In appointments.module.ts
imports: [forwardRef(() => SchedulesModule), ServicesModule],
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/appointments/application/appointments-occupied-windows.provider.ts
git add src/modules/schedules/infrastructure/schedules.module.ts
git add src/modules/appointments/infrastructure/appointments.module.ts
git commit -m "feat(appointments): wire OccupiedWindowsProvider to replace schedules stub"
```

---

### Task 6: Infrastructure — Repository, Controller & Module

**Files:** All `infrastructure/` files

- [ ] **Step 1: Create `src/modules/appointments/infrastructure/appointments.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentService, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentServiceEntity } from '../domain/appointment-service.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { LoyaltyTransactionType } from '../domain/loyalty-transaction-type.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

type AppointmentWithServices = Appointment & { appointmentServices: AppointmentService[] };

@Injectable()
export class AppointmentsRepository implements IAppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { customerId: string; barberId: string; startsAt: Date; totalAmount: number; notes: string | null; services: Array<{ serviceId: string | null; packageId: string | null; serviceName: string; priceSnapshot: number; durationMinutes: number; pointsEarnedSnapshot: number; redeemedWithPoints: boolean }> }): Promise<AppointmentEntity> {
    const { services, ...rest } = data;
    const record = await this.prisma.appointment.create({
      data: {
        ...rest,
        status: 'PENDING',
        appointmentServices: { create: services },
      },
      include: { appointmentServices: true },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<AppointmentEntity | null> {
    const r = await this.prisma.appointment.findFirst({ where: { id, disabledAt: null }, include: { appointmentServices: true } });
    return r ? this.toEntity(r) : null;
  }

  async findAll(params: { customerId?: string; barberId?: string; status?: AppointmentStatus; from?: Date; to?: Date; page: number; limit: number }): Promise<PaginatedResult<AppointmentEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where: Prisma.AppointmentWhereInput = { disabledAt: null };
    if (params.customerId) where.customerId = params.customerId;
    if (params.barberId) where.barberId = params.barberId;
    if (params.status) where.status = params.status;
    if (params.from || params.to) where.startsAt = { gte: params.from, lte: params.to };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({ where, skip, take, orderBy: { startsAt: 'asc' }, include: { appointmentServices: true } }),
      this.prisma.appointment.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async updateStatus(id: string, status: AppointmentStatus, endsAt?: Date): Promise<AppointmentEntity> {
    const data: Prisma.AppointmentUpdateInput = { status };
    if (endsAt) data.endsAt = endsAt;
    const r = await this.prisma.appointment.update({ where: { id }, data, include: { appointmentServices: true } });
    return this.toEntity(r);
  }

  async getOccupiedWindows(barberId: string, date: string): Promise<Array<{ start: number; end: number }>> {
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(`${date}T23:59:59Z`);
    const records = await this.prisma.appointment.findMany({
      where: {
        barberId,
        startsAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        disabledAt: null,
      },
      include: { appointmentServices: true },
    });
    return records.map((r) => {
      const startMins = r.startsAt.getUTCHours() * 60 + r.startsAt.getUTCMinutes();
      const duration = r.appointmentServices.reduce((sum, s) => sum + s.durationMinutes, 0);
      return { start: startMins, end: startMins + duration };
    });
  }

  async creditLoyaltyPoints(userId: string, appointmentId: string, points: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: points } } }),
      this.prisma.loyaltyTransaction.create({ data: { userId, appointmentId, type: LoyaltyTransactionType.EARNED, points } }),
    ]);
  }

  async deductLoyaltyPoints(userId: string, appointmentId: string, points: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: { decrement: points } } }),
      this.prisma.loyaltyTransaction.create({ data: { userId, appointmentId, type: LoyaltyTransactionType.REDEEMED, points } }),
    ]);
  }

  private toEntity(r: AppointmentWithServices): AppointmentEntity {
    const e = new AppointmentEntity();
    e.id = r.id; e.customerId = r.customerId; e.barberId = r.barberId;
    e.status = r.status as AppointmentStatus; e.startsAt = r.startsAt; e.endsAt = r.endsAt;
    e.totalAmount = r.totalAmount; e.notes = r.notes; e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    e.services = r.appointmentServices.map((s) => {
      const se = new AppointmentServiceEntity();
      se.id = s.id; se.appointmentId = s.appointmentId; se.serviceId = s.serviceId;
      se.packageId = s.packageId; se.serviceName = s.serviceName; se.priceSnapshot = s.priceSnapshot;
      se.durationMinutes = s.durationMinutes; se.pointsEarnedSnapshot = s.pointsEarnedSnapshot;
      se.redeemedWithPoints = s.redeemedWithPoints; se.createdAt = s.createdAt;
      return se;
    });
    return e;
  }
}
```

- [ ] **Step 2: Create `src/modules/appointments/infrastructure/appointments.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { BookAppointmentUseCase } from '../application/book-appointment.use-case';
import { ConfirmAppointmentUseCase } from '../application/confirm-appointment.use-case';
import { StartAppointmentUseCase } from '../application/start-appointment.use-case';
import { CompleteAppointmentUseCase } from '../application/complete-appointment.use-case';
import { CancelAppointmentUseCase } from '../application/cancel-appointment.use-case';
import { NoShowAppointmentUseCase } from '../application/no-show-appointment.use-case';
import { ListAppointmentsUseCase } from '../application/list-appointments.use-case';
import { GetAppointmentUseCase } from '../application/get-appointment.use-case';
import { BookAppointmentDto } from '../dto/book-appointment.dto';
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto';
import { AppointmentResponseDto, toAppointmentResponseDto } from '../dto/appointment-response.dto';

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(
    private readonly bookUseCase: BookAppointmentUseCase,
    private readonly confirmUseCase: ConfirmAppointmentUseCase,
    private readonly startUseCase: StartAppointmentUseCase,
    private readonly completeUseCase: CompleteAppointmentUseCase,
    private readonly cancelUseCase: CancelAppointmentUseCase,
    private readonly noShowUseCase: NoShowAppointmentUseCase,
    private readonly listUseCase: ListAppointmentsUseCase,
    private readonly getUseCase: GetAppointmentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List appointments' })
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListAppointmentsQueryDto) {
    const result = await this.listUseCase.execute({ ...query, from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined });
    return { ...result, data: result.data.map(toAppointmentResponseDto) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by id' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async get(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.getUseCase.execute(id));
  }

  @Post()
  @ApiOperation({ summary: 'Book appointment' })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  async book(@CurrentUser() user: UserEntity, @Body() dto: BookAppointmentDto): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.bookUseCase.execute(user.id, dto));
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiOperation({ summary: 'Confirm appointment (staff only)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async confirm(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.confirmUseCase.execute(id));
  }

  @Patch(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiOperation({ summary: 'Start appointment (staff only)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async start(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.startUseCase.execute(id));
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiOperation({ summary: 'Complete appointment (staff only)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async complete(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.completeUseCase.execute(id));
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async cancel(@CurrentUser() user: UserEntity, @Param('id') id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.cancelUseCase.execute(id, user.id, user.role));
  }

  @Patch(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiOperation({ summary: 'Mark appointment as no-show (staff only)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async noShow(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponseDto(await this.noShowUseCase.execute(id));
  }
}
```

- [ ] **Step 3: Create `src/modules/appointments/infrastructure/settings.provider.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ISettingsProvider } from '../domain/settings.provider.interface';

@Injectable()
export class SettingsProvider implements ISettingsProvider {
  constructor(private readonly prisma: PrismaService) {}
  async getValue(key: string): Promise<string | null> {
    const r = await this.prisma.setting.findUnique({ where: { key } });
    return r?.value ?? null;
  }
}
```

- [ ] **Step 4: Create `src/modules/appointments/infrastructure/appointments.module.ts`**

```typescript
import { forwardRef, Module } from '@nestjs/common';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { ISettingsProvider } from '../domain/settings.provider.interface';
import { AppointmentsRepository } from './appointments.repository';
import { SettingsProvider } from './settings.provider';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsOccupiedWindowsProvider } from '../application/appointments-occupied-windows.provider';
import { IOccupiedWindowsProvider } from '../../schedules/domain/occupied-windows-provider.interface';
import { BookAppointmentUseCase } from '../application/book-appointment.use-case';
import { ConfirmAppointmentUseCase } from '../application/confirm-appointment.use-case';
import { StartAppointmentUseCase } from '../application/start-appointment.use-case';
import { CompleteAppointmentUseCase } from '../application/complete-appointment.use-case';
import { CancelAppointmentUseCase } from '../application/cancel-appointment.use-case';
import { NoShowAppointmentUseCase } from '../application/no-show-appointment.use-case';
import { ListAppointmentsUseCase } from '../application/list-appointments.use-case';
import { GetAppointmentUseCase } from '../application/get-appointment.use-case';
import { ServicesModule } from '../../services/infrastructure/services.module';
import { UsersModule } from '../../users/infrastructure/users.module';
import { SchedulesModule } from '../../schedules/infrastructure/schedules.module';

@Module({
  imports: [ServicesModule, UsersModule, forwardRef(() => SchedulesModule)],
  controllers: [AppointmentsController],
  providers: [
    { provide: IAppointmentsRepository, useClass: AppointmentsRepository },
    { provide: ISettingsProvider, useClass: SettingsProvider },
    { provide: IOccupiedWindowsProvider, useClass: AppointmentsOccupiedWindowsProvider },
    AppointmentsOccupiedWindowsProvider,
    BookAppointmentUseCase, ConfirmAppointmentUseCase, StartAppointmentUseCase,
    CompleteAppointmentUseCase, CancelAppointmentUseCase, NoShowAppointmentUseCase,
    ListAppointmentsUseCase, GetAppointmentUseCase,
  ],
  exports: [IAppointmentsRepository, AppointmentsOccupiedWindowsProvider, IOccupiedWindowsProvider],
})
export class AppointmentsModule {}
```

- [ ] **Step 5: Add `AppointmentsModule` to `src/app.module.ts`**

Add `AppointmentsModule` to the `imports` array.

- [ ] **Step 6: Run tests and verify server**

```bash
npm run test
npm run start:dev
```

Verify `/appointments` endpoints appear in http://localhost:3000/api.

- [ ] **Step 7: Commit**

```bash
git add src/modules/appointments/ src/app.module.ts
git commit -m "feat(appointments): add full appointments module with booking, transitions, and loyalty integration"
```
