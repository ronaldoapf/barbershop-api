# Barbershop API — Schedules & Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement barber working hours CRUD and the slot-generation algorithm that powers the availability check endpoint.

**Architecture:** `schedules` module owns `BarberWorkingHoursEntity` and the availability query. Slot generation is pure computation in the application layer — no framework dependencies. Availability endpoint is public; working hours write operations require OWNER or the barber themselves (BARBER role owning their own record).

**Tech Stack:** NestJS 11, Prisma 7, date-fns (pure date math), class-validator, @nestjs/swagger

**Prerequisite:** Plans 1 (Foundation), 2 (Auth & Users), 3 (Service Catalog) must be complete.

## Global Constraints

- Package manager: npm only
- All source code in English; user-facing messages in pt-BR
- Soft deletes: reads filter `disabledAt: null`
- Never read `process.env` directly
- Prices in integer cents
- Slot interval is runtime-configurable via `SettingEntity` key `slot_interval_minutes` (default 30)
- Time strings are `"HH:mm"` (24-hour), dates are ISO strings `"YYYY-MM-DD"`

---

## File Structure

```
src/modules/schedules/
  application/
    create-working-hours.use-case.ts + spec
    update-working-hours.use-case.ts + spec
    delete-working-hours.use-case.ts + spec
    list-working-hours.use-case.ts + spec
    get-availability.use-case.ts + spec
    slot-generator.ts              ← pure function, no @Injectable
  domain/
    barber-working-hours.entity.ts
    working-hours-type.enum.ts
    barber-working-hours.repository.interface.ts
    availability-slot.ts           ← plain interface, no class
  dto/
    create-working-hours.dto.ts
    update-working-hours.dto.ts
    working-hours-response.dto.ts
    availability-query.dto.ts
    availability-slot-response.dto.ts
  infrastructure/
    barber-working-hours.repository.ts
    schedules.controller.ts
    schedules.module.ts
```

---

### Task 1: Domain

**Files:** All `domain/` files

**Interfaces:**
- Produces: `BarberWorkingHoursEntity`, `WorkingHoursType`, `IBarberWorkingHoursRepository`, `AvailabilitySlot`

- [ ] **Step 1: Create `src/modules/schedules/domain/working-hours-type.enum.ts`**

```typescript
export enum WorkingHoursType {
  WEEKLY = 'WEEKLY',
  SPECIFIC_DATE = 'SPECIFIC_DATE',
}
```

- [ ] **Step 2: Create `src/modules/schedules/domain/barber-working-hours.entity.ts`**

```typescript
import { WorkingHoursType } from './working-hours-type.enum';

export class BarberWorkingHoursEntity {
  id: string;
  barberId: string;
  type: WorkingHoursType;
  dayOfWeek: number | null;  // 0=Sun, 1=Mon, ..., 6=Sat; null when SPECIFIC_DATE
  specificDate: string | null; // "YYYY-MM-DD"; null when WEEKLY
  startTime: string | null;    // "HH:mm"; null means day off
  endTime: string | null;      // "HH:mm"; null means day off
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 3: Create `src/modules/schedules/domain/availability-slot.ts`**

```typescript
export interface AvailabilitySlot {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  available: boolean;
}
```

- [ ] **Step 4: Create `src/modules/schedules/domain/barber-working-hours.repository.interface.ts`**

```typescript
import { BarberWorkingHoursEntity } from './barber-working-hours.entity';
import { WorkingHoursType } from './working-hours-type.enum';

export abstract class IBarberWorkingHoursRepository {
  abstract create(data: {
    barberId: string;
    type: WorkingHoursType;
    dayOfWeek: number | null;
    specificDate: string | null;
    startTime: string | null;
    endTime: string | null;
  }): Promise<BarberWorkingHoursEntity>;

  abstract findById(id: string): Promise<BarberWorkingHoursEntity | null>;

  abstract findByBarber(barberId: string): Promise<BarberWorkingHoursEntity[]>;

  abstract findEffectiveForDate(barberId: string, date: string): Promise<BarberWorkingHoursEntity | null>;

  abstract update(
    id: string,
    data: Partial<{ startTime: string | null; endTime: string | null; dayOfWeek: number | null; specificDate: string | null }>,
  ): Promise<BarberWorkingHoursEntity>;

  abstract softDelete(id: string): Promise<void>;
}
```

`findEffectiveForDate` must: first look for a SPECIFIC_DATE record matching that date, then fall back to the WEEKLY record matching that day-of-week. Returns null if neither exists (barber is off).

- [ ] **Step 5: Commit**

```bash
git add src/modules/schedules/domain/
git commit -m "feat(schedules): add domain entities and repository interface"
```

---

### Task 2: DTOs

**Files:** All `dto/` files

- [ ] **Step 1: Create `src/modules/schedules/dto/create-working-hours.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { WorkingHoursType } from '../domain/working-hours-type.enum';

export class CreateWorkingHoursDto {
  @ApiProperty({ enum: WorkingHoursType })
  @IsEnum(WorkingHoursType)
  type: WorkingHoursType;

  @ApiPropertyOptional({ description: '0=Sun..6=Sat; required when type=WEEKLY' })
  @IsOptional() @IsInt() @Min(0) @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD; required when type=SPECIFIC_DATE' })
  @IsOptional() @IsISO8601()
  specificDate?: string;

  @ApiPropertyOptional({ description: 'HH:mm; null means day off' })
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @ApiPropertyOptional({ description: 'HH:mm; null means day off' })
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}
```

- [ ] **Step 2: Create `src/modules/schedules/dto/update-working-hours.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateWorkingHoursDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}
```

- [ ] **Step 3: Create `src/modules/schedules/dto/working-hours-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';

export class WorkingHoursResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() barberId: string;
  @ApiProperty({ enum: WorkingHoursType }) type: WorkingHoursType;
  @ApiPropertyOptional() dayOfWeek: number | null;
  @ApiPropertyOptional() specificDate: string | null;
  @ApiPropertyOptional() startTime: string | null;
  @ApiPropertyOptional() endTime: string | null;
  @ApiProperty() createdAt: Date;
}

export function toWorkingHoursResponseDto(e: BarberWorkingHoursEntity): WorkingHoursResponseDto {
  return { id: e.id, barberId: e.barberId, type: e.type, dayOfWeek: e.dayOfWeek, specificDate: e.specificDate, startTime: e.startTime, endTime: e.endTime, createdAt: e.createdAt };
}
```

- [ ] **Step 4: Create `src/modules/schedules/dto/availability-query.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Barber UUID' }) @IsUUID() barberId: string;
  @ApiProperty({ description: 'YYYY-MM-DD' }) @IsISO8601() date: string;
  @ApiProperty({ description: 'Duration of requested service in minutes' }) durationMinutes: number;
}
```

- [ ] **Step 5: Create `src/modules/schedules/dto/availability-slot-response.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AvailabilitySlot } from '../domain/availability-slot';

export class AvailabilitySlotResponseDto {
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() available: boolean;
}

export function toAvailabilitySlotResponseDto(s: AvailabilitySlot): AvailabilitySlotResponseDto {
  return { startTime: s.startTime, endTime: s.endTime, available: s.available };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/schedules/dto/
git commit -m "feat(schedules): add schedule and availability DTOs"
```

---

### Task 3: Slot Generator (Pure Function)

**Files:** `src/modules/schedules/application/slot-generator.ts`

**Interfaces:**
- Produces: `generateSlots(startTime, endTime, durationMinutes, intervalMinutes, occupiedWindows): AvailabilitySlot[]`
- Consumes: `AvailabilitySlot` domain type

Time representation: all internal math is done in minutes-since-midnight (e.g., `"09:00"` → 540). A slot is available when no occupied window overlaps it.

- [ ] **Step 1: Write failing tests**

`src/modules/schedules/application/slot-generator.spec.ts`:
```typescript
import { generateSlots } from './slot-generator';

describe('generateSlots', () => {
  it('generates slots within working hours', () => {
    const slots = generateSlots('09:00', '10:00', 30, 30, []);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:30', available: true });
    expect(slots[1]).toEqual({ startTime: '09:30', endTime: '10:00', available: true });
  });

  it('marks occupied slots as unavailable', () => {
    const slots = generateSlots('09:00', '11:00', 30, 30, [{ start: 570, end: 600 }]); // 09:30-10:00
    expect(slots[0].available).toBe(true);  // 09:00
    expect(slots[1].available).toBe(false); // 09:30
    expect(slots[2].available).toBe(true);  // 10:00
    expect(slots[3].available).toBe(true);  // 10:30
  });

  it('marks slot unavailable when occupied window overlaps start', () => {
    const slots = generateSlots('09:00', '10:30', 60, 30, [{ start: 540, end: 570 }]); // 09:00-09:30
    // 09:00-10:00 overlaps 09:00-09:30 → unavailable
    expect(slots[0].available).toBe(false);
    // 09:30-10:30 does not overlap → available
    expect(slots[1].available).toBe(true);
  });

  it('returns empty array when working hours are null (day off)', () => {
    const slots = generateSlots(null, null, 30, 30, []);
    expect(slots).toHaveLength(0);
  });

  it('returns no slots when duration exceeds remaining time', () => {
    const slots = generateSlots('09:00', '09:20', 30, 30, []);
    expect(slots).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/modules/schedules/application/slot-generator.spec.ts --no-coverage
```

Expected: FAIL — `generateSlots` is not defined.

- [ ] **Step 3: Implement `src/modules/schedules/application/slot-generator.ts`**

```typescript
import { AvailabilitySlot } from '../domain/availability-slot';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function generateSlots(
  startTime: string | null,
  endTime: string | null,
  durationMinutes: number,
  intervalMinutes: number,
  occupiedWindows: Array<{ start: number; end: number }>,
): AvailabilitySlot[] {
  if (!startTime || !endTime) return [];

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots: AvailabilitySlot[] = [];

  for (let cursor = start; cursor + durationMinutes <= end; cursor += intervalMinutes) {
    const slotEnd = cursor + durationMinutes;
    const available = !occupiedWindows.some((w) => w.start < slotEnd && w.end > cursor);
    slots.push({ startTime: toTimeString(cursor), endTime: toTimeString(slotEnd), available });
  }

  return slots;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest src/modules/schedules/application/slot-generator.spec.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/schedules/application/slot-generator.ts src/modules/schedules/application/slot-generator.spec.ts
git commit -m "feat(schedules): implement slot generator with tests"
```

---

### Task 4: Use Cases

**Files:** All use cases in `application/` (except slot-generator)

**Interfaces:**
- Consumes: `IBarberWorkingHoursRepository`, `generateSlots`, `AvailabilitySlot`
- Produces: `CreateWorkingHoursUseCase`, `UpdateWorkingHoursUseCase`, `DeleteWorkingHoursUseCase`, `ListWorkingHoursUseCase`, `GetAvailabilityUseCase`

The `GetAvailabilityUseCase` also needs access to the appointments repository to find occupied windows for a given barber+date. To avoid importing the appointments module, inject `IBarberWorkingHoursRepository` from this module and `IAppointmentsRepository` from the appointments module (which will be provided later). For now, define a local `IOccupiedWindowsProvider` abstract class in `domain/` so the schedules module has no dependency on the appointments module.

- [ ] **Step 1: Create `src/modules/schedules/domain/occupied-windows-provider.interface.ts`**

```typescript
export abstract class IOccupiedWindowsProvider {
  abstract getOccupiedWindows(barberId: string, date: string): Promise<Array<{ start: number; end: number }>>;
}
```

- [ ] **Step 2: Write tests for CreateWorkingHoursUseCase**

`src/modules/schedules/application/create-working-hours.use-case.spec.ts`:
```typescript
import { CreateWorkingHoursUseCase } from './create-working-hours.use-case';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { BadRequestException } from '@nestjs/common';

const mockRepo = (): jest.Mocked<IBarberWorkingHoursRepository> => ({
  create: jest.fn(), findById: jest.fn(), findByBarber: jest.fn(),
  findEffectiveForDate: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
});

describe('CreateWorkingHoursUseCase', () => {
  it('validates WEEKLY requires dayOfWeek', async () => {
    await expect(
      new CreateWorkingHoursUseCase(mockRepo()).execute('barber1', { type: WorkingHoursType.WEEKLY }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates SPECIFIC_DATE requires specificDate', async () => {
    await expect(
      new CreateWorkingHoursUseCase(mockRepo()).execute('barber1', { type: WorkingHoursType.SPECIFIC_DATE }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates WEEKLY working hours', async () => {
    const repo = mockRepo();
    repo.create.mockResolvedValue({ id: '1' } as any);
    await new CreateWorkingHoursUseCase(repo).execute('b1', { type: WorkingHoursType.WEEKLY, dayOfWeek: 1, startTime: '09:00', endTime: '18:00' });
    expect(repo.create).toHaveBeenCalledWith({ barberId: 'b1', type: WorkingHoursType.WEEKLY, dayOfWeek: 1, specificDate: null, startTime: '09:00', endTime: '18:00' });
  });
});
```

- [ ] **Step 3: Implement all working hours use cases**

`src/modules/schedules/application/create-working-hours.use-case.ts`:
```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { CreateWorkingHoursDto } from '../dto/create-working-hours.dto';
import { WorkingHoursType } from '../domain/working-hours-type.enum';

@Injectable()
export class CreateWorkingHoursUseCase {
  constructor(private readonly repo: IBarberWorkingHoursRepository) {}
  async execute(barberId: string, dto: CreateWorkingHoursDto): Promise<BarberWorkingHoursEntity> {
    if (dto.type === WorkingHoursType.WEEKLY && dto.dayOfWeek === undefined) {
      throw new BadRequestException('dayOfWeek é obrigatório para horários semanais');
    }
    if (dto.type === WorkingHoursType.SPECIFIC_DATE && !dto.specificDate) {
      throw new BadRequestException('specificDate é obrigatório para datas específicas');
    }
    return this.repo.create({
      barberId,
      type: dto.type,
      dayOfWeek: dto.type === WorkingHoursType.WEEKLY ? dto.dayOfWeek! : null,
      specificDate: dto.type === WorkingHoursType.SPECIFIC_DATE ? dto.specificDate! : null,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
    });
  }
}
```

`src/modules/schedules/application/update-working-hours.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';

@Injectable()
export class UpdateWorkingHoursUseCase {
  constructor(private readonly repo: IBarberWorkingHoursRepository) {}
  async execute(id: string, dto: UpdateWorkingHoursDto): Promise<BarberWorkingHoursEntity> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Horário não encontrado');
    return this.repo.update(id, dto);
  }
}
```

`src/modules/schedules/application/delete-working-hours.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';

@Injectable()
export class DeleteWorkingHoursUseCase {
  constructor(private readonly repo: IBarberWorkingHoursRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Horário não encontrado');
    await this.repo.softDelete(id);
  }
}
```

`src/modules/schedules/application/list-working-hours.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';

@Injectable()
export class ListWorkingHoursUseCase {
  constructor(private readonly repo: IBarberWorkingHoursRepository) {}
  async execute(barberId: string): Promise<BarberWorkingHoursEntity[]> {
    return this.repo.findByBarber(barberId);
  }
}
```

- [ ] **Step 4: Write tests for GetAvailabilityUseCase**

`src/modules/schedules/application/get-availability.use-case.spec.ts`:
```typescript
import { GetAvailabilityUseCase } from './get-availability.use-case';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { IOccupiedWindowsProvider } from '../domain/occupied-windows-provider.interface';

const mockWorkingHoursRepo = (): jest.Mocked<IBarberWorkingHoursRepository> => ({
  create: jest.fn(), findById: jest.fn(), findByBarber: jest.fn(),
  findEffectiveForDate: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
});
const mockOccupied = (): jest.Mocked<IOccupiedWindowsProvider> => ({ getOccupiedWindows: jest.fn() });

describe('GetAvailabilityUseCase', () => {
  it('returns empty slots when barber has no working hours for date', async () => {
    const repo = mockWorkingHoursRepo();
    const occupied = mockOccupied();
    repo.findEffectiveForDate.mockResolvedValue(null);
    const slots = await new GetAvailabilityUseCase(repo, occupied).execute({ barberId: 'b1', date: '2026-07-01', durationMinutes: 30, intervalMinutes: 30 });
    expect(slots).toHaveLength(0);
  });

  it('returns available slots excluding occupied windows', async () => {
    const repo = mockWorkingHoursRepo();
    const occupied = mockOccupied();
    repo.findEffectiveForDate.mockResolvedValue({ startTime: '09:00', endTime: '10:00' } as any);
    occupied.getOccupiedWindows.mockResolvedValue([{ start: 570, end: 600 }]); // 09:30-10:00
    const slots = await new GetAvailabilityUseCase(repo, occupied).execute({ barberId: 'b1', date: '2026-07-01', durationMinutes: 30, intervalMinutes: 30 });
    expect(slots).toHaveLength(2);
    expect(slots[0].available).toBe(true);  // 09:00
    expect(slots[1].available).toBe(false); // 09:30
  });
});
```

- [ ] **Step 5: Implement GetAvailabilityUseCase**

`src/modules/schedules/application/get-availability.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { IOccupiedWindowsProvider } from '../domain/occupied-windows-provider.interface';
import { AvailabilitySlot } from '../domain/availability-slot';
import { generateSlots } from './slot-generator';

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    private readonly workingHoursRepo: IBarberWorkingHoursRepository,
    private readonly occupiedWindowsProvider: IOccupiedWindowsProvider,
  ) {}

  async execute(params: { barberId: string; date: string; durationMinutes: number; intervalMinutes: number }): Promise<AvailabilitySlot[]> {
    const workingHours = await this.workingHoursRepo.findEffectiveForDate(params.barberId, params.date);
    if (!workingHours) return [];

    const occupiedWindows = await this.occupiedWindowsProvider.getOccupiedWindows(params.barberId, params.date);
    return generateSlots(workingHours.startTime, workingHours.endTime, params.durationMinutes, params.intervalMinutes, occupiedWindows);
  }
}
```

- [ ] **Step 6: Run all schedule use case tests**

```bash
npx jest src/modules/schedules/application/ --no-coverage
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/schedules/application/ src/modules/schedules/domain/
git commit -m "feat(schedules): add working hours and availability use cases"
```

---

### Task 5: Infrastructure — Repository, Controller & Module

**Files:** All `infrastructure/` files

- [ ] **Step 1: Create `src/modules/schedules/infrastructure/barber-working-hours.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { BarberWorkingHours } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';

@Injectable()
export class BarberWorkingHoursRepository implements IBarberWorkingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { barberId: string; type: WorkingHoursType; dayOfWeek: number | null; specificDate: string | null; startTime: string | null; endTime: string | null }): Promise<BarberWorkingHoursEntity> {
    return this.toEntity(await this.prisma.barberWorkingHours.create({ data }));
  }

  async findById(id: string): Promise<BarberWorkingHoursEntity | null> {
    const r = await this.prisma.barberWorkingHours.findFirst({ where: { id, disabledAt: null } });
    return r ? this.toEntity(r) : null;
  }

  async findByBarber(barberId: string): Promise<BarberWorkingHoursEntity[]> {
    const records = await this.prisma.barberWorkingHours.findMany({ where: { barberId, disabledAt: null }, orderBy: [{ type: 'asc' }, { dayOfWeek: 'asc' }] });
    return records.map((r) => this.toEntity(r));
  }

  async findEffectiveForDate(barberId: string, date: string): Promise<BarberWorkingHoursEntity | null> {
    // SPECIFIC_DATE overrides WEEKLY — check it first
    const specific = await this.prisma.barberWorkingHours.findFirst({
      where: { barberId, type: 'SPECIFIC_DATE', specificDate: date, disabledAt: null },
    });
    if (specific) return this.toEntity(specific);

    const jsDate = new Date(date);
    const dayOfWeek = jsDate.getUTCDay();
    const weekly = await this.prisma.barberWorkingHours.findFirst({
      where: { barberId, type: 'WEEKLY', dayOfWeek, disabledAt: null },
    });
    return weekly ? this.toEntity(weekly) : null;
  }

  async update(id: string, data: Partial<{ startTime: string | null; endTime: string | null; dayOfWeek: number | null; specificDate: string | null }>): Promise<BarberWorkingHoursEntity> {
    return this.toEntity(await this.prisma.barberWorkingHours.update({ where: { id }, data }));
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.barberWorkingHours.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(r: BarberWorkingHours): BarberWorkingHoursEntity {
    const e = new BarberWorkingHoursEntity();
    e.id = r.id; e.barberId = r.barberId; e.type = r.type as WorkingHoursType;
    e.dayOfWeek = r.dayOfWeek; e.specificDate = r.specificDate;
    e.startTime = r.startTime; e.endTime = r.endTime;
    e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    return e;
  }
}
```

- [ ] **Step 2: Create `src/modules/schedules/infrastructure/schedules.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { ConfigService } from '@nestjs/config';
import { CreateWorkingHoursUseCase } from '../application/create-working-hours.use-case';
import { UpdateWorkingHoursUseCase } from '../application/update-working-hours.use-case';
import { DeleteWorkingHoursUseCase } from '../application/delete-working-hours.use-case';
import { ListWorkingHoursUseCase } from '../application/list-working-hours.use-case';
import { GetAvailabilityUseCase } from '../application/get-availability.use-case';
import { CreateWorkingHoursDto } from '../dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { WorkingHoursResponseDto, toWorkingHoursResponseDto } from '../dto/working-hours-response.dto';
import { AvailabilitySlotResponseDto, toAvailabilitySlotResponseDto } from '../dto/availability-slot-response.dto';

@ApiTags('schedules')
@Controller()
export class SchedulesController {
  constructor(
    private readonly createWorkingHoursUseCase: CreateWorkingHoursUseCase,
    private readonly updateWorkingHoursUseCase: UpdateWorkingHoursUseCase,
    private readonly deleteWorkingHoursUseCase: DeleteWorkingHoursUseCase,
    private readonly listWorkingHoursUseCase: ListWorkingHoursUseCase,
    private readonly getAvailabilityUseCase: GetAvailabilityUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Get('barbers/:barberId/working-hours')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List working hours for a barber' })
  @ApiResponse({ status: 200, type: [WorkingHoursResponseDto] })
  async listWorkingHours(@Param('barberId') barberId: string): Promise<WorkingHoursResponseDto[]> {
    return (await this.listWorkingHoursUseCase.execute(barberId)).map(toWorkingHoursResponseDto);
  }

  @Post('barbers/:barberId/working-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create working hours for a barber' })
  @ApiResponse({ status: 201, type: WorkingHoursResponseDto })
  async createWorkingHours(@Param('barberId') barberId: string, @Body() dto: CreateWorkingHoursDto): Promise<WorkingHoursResponseDto> {
    return toWorkingHoursResponseDto(await this.createWorkingHoursUseCase.execute(barberId, dto));
  }

  @Patch('barbers/:barberId/working-hours/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update working hours entry' })
  @ApiResponse({ status: 200, type: WorkingHoursResponseDto })
  async updateWorkingHours(@Param('id') id: string, @Body() dto: UpdateWorkingHoursDto): Promise<WorkingHoursResponseDto> {
    return toWorkingHoursResponseDto(await this.updateWorkingHoursUseCase.execute(id, dto));
  }

  @Delete('barbers/:barberId/working-hours/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete working hours entry' })
  @ApiResponse({ status: 200 })
  async deleteWorkingHours(@Param('id') id: string): Promise<void> {
    await this.deleteWorkingHoursUseCase.execute(id);
  }

  @Get('barbers/:barberId/availability')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get available time slots for a barber on a given date' })
  @ApiResponse({ status: 200, type: [AvailabilitySlotResponseDto] })
  async getAvailability(@Param('barberId') barberId: string, @Query() query: AvailabilityQueryDto): Promise<AvailabilitySlotResponseDto[]> {
    const intervalMinutes = parseInt(this.configService.get('SLOT_INTERVAL_MINUTES', '30'), 10);
    const slots = await this.getAvailabilityUseCase.execute({ barberId, date: query.date, durationMinutes: query.durationMinutes, intervalMinutes });
    return slots.map(toAvailabilitySlotResponseDto);
  }
}
```

**Note on `slot_interval_minutes`:** The full plan uses `SettingEntity` (Plan 6), but this controller reads it from env (`SLOT_INTERVAL_MINUTES`) with the same default of 30. In Plan 6, this gets migrated to use `SettingsService`.

- [ ] **Step 3: Create `src/modules/schedules/infrastructure/schedules.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { IBarberWorkingHoursRepository } from '../domain/barber-working-hours.repository.interface';
import { IOccupiedWindowsProvider } from '../domain/occupied-windows-provider.interface';
import { BarberWorkingHoursRepository } from './barber-working-hours.repository';
import { SchedulesController } from './schedules.controller';
import { CreateWorkingHoursUseCase } from '../application/create-working-hours.use-case';
import { UpdateWorkingHoursUseCase } from '../application/update-working-hours.use-case';
import { DeleteWorkingHoursUseCase } from '../application/delete-working-hours.use-case';
import { ListWorkingHoursUseCase } from '../application/list-working-hours.use-case';
import { GetAvailabilityUseCase } from '../application/get-availability.use-case';

// Stub — the appointments module will replace this binding in AppModule via forwardRef or overrideProvider
import { NullOccupiedWindowsProvider } from './null-occupied-windows.provider';

@Module({
  controllers: [SchedulesController],
  providers: [
    { provide: IBarberWorkingHoursRepository, useClass: BarberWorkingHoursRepository },
    { provide: IOccupiedWindowsProvider, useClass: NullOccupiedWindowsProvider },
    CreateWorkingHoursUseCase, UpdateWorkingHoursUseCase, DeleteWorkingHoursUseCase,
    ListWorkingHoursUseCase, GetAvailabilityUseCase,
  ],
  exports: [IBarberWorkingHoursRepository, IOccupiedWindowsProvider],
})
export class SchedulesModule {}
```

- [ ] **Step 4: Create `src/modules/schedules/infrastructure/null-occupied-windows.provider.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { IOccupiedWindowsProvider } from '../domain/occupied-windows-provider.interface';

// Temporary stub — returns no occupied windows. Replaced by AppointmentsOccupiedWindowsProvider in Plan 5.
@Injectable()
export class NullOccupiedWindowsProvider implements IOccupiedWindowsProvider {
  async getOccupiedWindows(_barberId: string, _date: string): Promise<Array<{ start: number; end: number }>> {
    return [];
  }
}
```

- [ ] **Step 5: Add `SchedulesModule` to `src/app.module.ts`**

Add `SchedulesModule` to the `imports` array.

- [ ] **Step 6: Run tests and verify server**

```bash
npm run test
npm run start:dev
```

Verify `GET /barbers/:barberId/availability` appears in http://localhost:3000/api.

- [ ] **Step 7: Commit**

```bash
git add src/modules/schedules/ src/app.module.ts
git commit -m "feat(schedules): add working hours CRUD and availability slot endpoint"
```
