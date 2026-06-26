# Barbershop API — Notifications & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement settings CRUD (key-value store for runtime config), email/SMS notification event listeners, BullMQ appointment reminder jobs (24 h before), and the loyalty history endpoint.

**Architecture:** `notifications` module owns `MailService`, `SmsService`, and `QueueService` and listens for `appointment.*` events. `settings` module owns `SettingEntity`. Neither module imports `appointments`. Loyalty history is a read-only endpoint in the `users` module.

**Tech Stack:** NestJS 11, @nestjs/event-emitter (EventEmitter2), @nestjs/bullmq + bullmq, Resend (email), Twilio (SMS), Prisma 7, class-validator, @nestjs/swagger

**Prerequisite:** Plans 1–5 must be complete.

## Global Constraints

- Package manager: npm only
- All source code in English; user-facing messages in pt-BR
- Soft deletes: reads filter `disabledAt: null`
- Never read `process.env` directly; use `ConfigService`
- Settings keys: `cancellation_window_hours`, `slot_interval_minutes`, `loyalty_enabled`

---

## File Structure

```
src/modules/settings/
  application/
    get-setting.use-case.ts
    upsert-setting.use-case.ts
    list-settings.use-case.ts
  domain/
    setting.entity.ts
    settings.repository.interface.ts
  dto/
    upsert-setting.dto.ts
    setting-response.dto.ts
  infrastructure/
    settings.repository.ts
    settings.controller.ts
    settings.module.ts

src/modules/notifications/
  application/
    appointment-booked.listener.ts
    appointment-completed.listener.ts
    appointment-cancelled.listener.ts
    appointment-reminder.processor.ts  ← BullMQ processor
  infrastructure/
    notifications.module.ts

src/shared/
  services/
    mail.service.ts
    sms.service.ts
    queue.service.ts

src/modules/users/
  application/
    list-loyalty-transactions.use-case.ts + spec
  dto/
    loyalty-transaction-response.dto.ts
  domain/
    loyalty-transaction.entity.ts  ← if not already in users domain (add here)
  infrastructure/
    (add GET /users/me/loyalty-transactions to users.controller.ts)
    (add getLoyaltyTransactions to IUsersRepository + UsersRepository)
```

---

### Task 1: Shared Services (Mail, SMS, Queue)

**Files:** `src/shared/services/mail.service.ts`, `sms.service.ts`, `queue.service.ts`

Install dependencies first:
```bash
npm install @nestjs/bullmq bullmq twilio
```

- [ ] **Step 1: Create `src/shared/services/mail.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly client: Resend;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('MAIL_FROM', 'noreply@barbershop.app');
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.client.emails.send({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
    }
  }
}
```

- [ ] **Step 2: Create `src/shared/services/sms.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly client: Twilio;
  private readonly from: string;
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.from = this.configService.get<string>('TWILIO_FROM_NUMBER', '');
    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  async send(to: string, message: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('SMS not configured — skipping');
      return;
    }
    try {
      await this.client.messages.create({ from: this.from, to, body: message });
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${to}: ${err}`);
    }
  }
}
```

- [ ] **Step 3: Create `src/shared/services/queue.service.ts`**

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const APPOINTMENT_REMINDER_QUEUE = 'appointment-reminder';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(APPOINTMENT_REMINDER_QUEUE) private readonly reminderQueue: Queue,
  ) {}

  async scheduleReminder(appointmentId: string, startsAt: Date): Promise<void> {
    const delay = startsAt.getTime() - Date.now() - 24 * 60 * 60 * 1000;
    if (delay <= 0) return; // appointment is less than 24h away
    await this.reminderQueue.add('reminder', { appointmentId }, { delay, jobId: `reminder:${appointmentId}` });
  }

  async cancelReminder(appointmentId: string): Promise<void> {
    const job = await this.reminderQueue.getJob(`reminder:${appointmentId}`);
    if (job) await job.remove();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/services/
git commit -m "feat(shared): add MailService, SmsService, QueueService"
```

---

### Task 2: Settings Module

**Files:** All settings files

**Interfaces:**
- Produces: `SettingEntity`, `ISettingsRepository`, `GetSettingUseCase`, `UpsertSettingUseCase`, `ListSettingsUseCase`, `SettingsController`, `SettingsModule`

- [ ] **Step 1: Create domain**

`src/modules/settings/domain/setting.entity.ts`:
```typescript
export class SettingEntity {
  key: string;
  value: string;
  updatedAt: Date;
}
```

`src/modules/settings/domain/settings.repository.interface.ts`:
```typescript
import { SettingEntity } from './setting.entity';

export abstract class ISettingsRepository {
  abstract findByKey(key: string): Promise<SettingEntity | null>;
  abstract findAll(): Promise<SettingEntity[]>;
  abstract upsert(key: string, value: string): Promise<SettingEntity>;
}
```

- [ ] **Step 2: Create DTOs**

`src/modules/settings/dto/upsert-setting.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpsertSettingDto {
  @ApiProperty() @IsString() value: string;
}
```

`src/modules/settings/dto/setting-response.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { SettingEntity } from '../domain/setting.entity';

export class SettingResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() value: string;
  @ApiProperty() updatedAt: Date;
}

export function toSettingResponseDto(e: SettingEntity): SettingResponseDto {
  return { key: e.key, value: e.value, updatedAt: e.updatedAt };
}
```

- [ ] **Step 3: Create use cases**

`src/modules/settings/application/list-settings.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingEntity } from '../domain/setting.entity';

@Injectable()
export class ListSettingsUseCase {
  constructor(private readonly repo: ISettingsRepository) {}
  async execute(): Promise<SettingEntity[]> { return this.repo.findAll(); }
}
```

`src/modules/settings/application/get-setting.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingEntity } from '../domain/setting.entity';

@Injectable()
export class GetSettingUseCase {
  constructor(private readonly repo: ISettingsRepository) {}
  async execute(key: string): Promise<SettingEntity> {
    const s = await this.repo.findByKey(key);
    if (!s) throw new NotFoundException(`Configuração "${key}" não encontrada`);
    return s;
  }
}
```

`src/modules/settings/application/upsert-setting.use-case.ts`:
```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingEntity } from '../domain/setting.entity';

const ALLOWED_KEYS = ['cancellation_window_hours', 'slot_interval_minutes', 'loyalty_enabled'];

@Injectable()
export class UpsertSettingUseCase {
  constructor(private readonly repo: ISettingsRepository) {}
  async execute(key: string, value: string): Promise<SettingEntity> {
    if (!ALLOWED_KEYS.includes(key)) throw new BadRequestException(`Chave de configuração inválida: ${key}`);
    return this.repo.upsert(key, value);
  }
}
```

- [ ] **Step 4: Create infrastructure**

`src/modules/settings/infrastructure/settings.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Setting } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingEntity } from '../domain/setting.entity';

@Injectable()
export class SettingsRepository implements ISettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<SettingEntity | null> {
    const r = await this.prisma.setting.findUnique({ where: { key } });
    return r ? this.toEntity(r) : null;
  }

  async findAll(): Promise<SettingEntity[]> {
    return (await this.prisma.setting.findMany()).map((r) => this.toEntity(r));
  }

  async upsert(key: string, value: string): Promise<SettingEntity> {
    return this.toEntity(await this.prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }));
  }

  private toEntity(r: Setting): SettingEntity {
    const e = new SettingEntity();
    e.key = r.key; e.value = r.value; e.updatedAt = r.updatedAt;
    return e;
  }
}
```

`src/modules/settings/infrastructure/settings.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { GetSettingUseCase } from '../application/get-setting.use-case';
import { UpsertSettingUseCase } from '../application/upsert-setting.use-case';
import { ListSettingsUseCase } from '../application/list-settings.use-case';
import { UpsertSettingDto } from '../dto/upsert-setting.dto';
import { SettingResponseDto, toSettingResponseDto } from '../dto/setting-response.dto';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class SettingsController {
  constructor(
    private readonly listUseCase: ListSettingsUseCase,
    private readonly getUseCase: GetSettingUseCase,
    private readonly upsertUseCase: UpsertSettingUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all settings (owner only)' })
  @ApiResponse({ status: 200, type: [SettingResponseDto] })
  async list(): Promise<SettingResponseDto[]> {
    return (await this.listUseCase.execute()).map(toSettingResponseDto);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get setting by key' })
  @ApiResponse({ status: 200, type: SettingResponseDto })
  async get(@Param('key') key: string): Promise<SettingResponseDto> {
    return toSettingResponseDto(await this.getUseCase.execute(key));
  }

  @Put(':key')
  @ApiOperation({ summary: 'Upsert setting value' })
  @ApiResponse({ status: 200, type: SettingResponseDto })
  async upsert(@Param('key') key: string, @Body() dto: UpsertSettingDto): Promise<SettingResponseDto> {
    return toSettingResponseDto(await this.upsertUseCase.execute(key, dto.value));
  }
}
```

`src/modules/settings/infrastructure/settings.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingsRepository } from './settings.repository';
import { SettingsController } from './settings.controller';
import { GetSettingUseCase } from '../application/get-setting.use-case';
import { UpsertSettingUseCase } from '../application/upsert-setting.use-case';
import { ListSettingsUseCase } from '../application/list-settings.use-case';

@Module({
  controllers: [SettingsController],
  providers: [
    { provide: ISettingsRepository, useClass: SettingsRepository },
    GetSettingUseCase, UpsertSettingUseCase, ListSettingsUseCase,
  ],
  exports: [ISettingsRepository],
})
export class SettingsModule {}
```

- [ ] **Step 5: Add `SettingsModule` to `src/app.module.ts`**

- [ ] **Step 6: Commit**

```bash
git add src/modules/settings/ src/app.module.ts
git commit -m "feat(settings): add settings CRUD module"
```

---

### Task 3: Notifications Module (Event Listeners + BullMQ)

**Files:** All notifications files

The notifications module listens for `appointment.*` events emitted by the appointments module. It must look up customer/barber contact info from the database directly (via PrismaService — processors may use Prisma directly per the architecture rules).

- [ ] **Step 1: Create `src/modules/notifications/application/appointment-booked.listener.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { MailService } from '../../../shared/services/mail.service';
import { SmsService } from '../../../shared/services/sms.service';
import { QueueService } from '../../../shared/services/queue.service';

@Injectable()
export class AppointmentBookedListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent('appointment.booked')
  async handle(payload: { appointmentId: string; customerId: string; barberId: string; startsAt: Date }): Promise<void> {
    const customer = await this.prisma.user.findUnique({ where: { id: payload.customerId } });
    if (!customer) return;

    const dateStr = new Date(payload.startsAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    await this.mailService.send(
      customer.email,
      'Agendamento confirmado',
      `<p>Olá ${customer.name}, seu agendamento para ${dateStr} foi realizado com sucesso!</p>`,
    );

    if (customer.phone) {
      await this.smsService.send(customer.phone, `Olá ${customer.name}! Seu agendamento para ${dateStr} foi confirmado.`);
    }

    await this.queueService.scheduleReminder(payload.appointmentId, new Date(payload.startsAt));
  }
}
```

- [ ] **Step 2: Create `src/modules/notifications/application/appointment-completed.listener.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { MailService } from '../../../shared/services/mail.service';

@Injectable()
export class AppointmentCompletedListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @OnEvent('appointment.completed')
  async handle(payload: { appointmentId: string; customerId: string; barberId: string }): Promise<void> {
    const customer = await this.prisma.user.findUnique({ where: { id: payload.customerId } });
    if (!customer) return;

    await this.mailService.send(
      customer.email,
      'Atendimento concluído — obrigado!',
      `<p>Olá ${customer.name}, obrigado pela sua visita! Esperamos você em breve.</p>`,
    );
  }
}
```

- [ ] **Step 3: Create `src/modules/notifications/application/appointment-cancelled.listener.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { MailService } from '../../../shared/services/mail.service';
import { SmsService } from '../../../shared/services/sms.service';
import { QueueService } from '../../../shared/services/queue.service';

@Injectable()
export class AppointmentCancelledListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent('appointment.cancelled')
  async handle(payload: { appointmentId: string; customerId: string; barberId: string }): Promise<void> {
    const customer = await this.prisma.user.findUnique({ where: { id: payload.customerId } });
    if (!customer) return;

    await this.mailService.send(
      customer.email,
      'Agendamento cancelado',
      `<p>Olá ${customer.name}, seu agendamento foi cancelado. Saudades! Agende novamente quando quiser.</p>`,
    );

    if (customer.phone) {
      await this.smsService.send(customer.phone, `Olá ${customer.name}, seu agendamento foi cancelado.`);
    }

    await this.queueService.cancelReminder(payload.appointmentId);
  }
}
```

- [ ] **Step 4: Create `src/modules/notifications/application/appointment-reminder.processor.ts`**

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { MailService } from '../../../shared/services/mail.service';
import { SmsService } from '../../../shared/services/sms.service';
import { APPOINTMENT_REMINDER_QUEUE } from '../../../shared/services/queue.service';

@Processor(APPOINTMENT_REMINDER_QUEUE)
export class AppointmentReminderProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {
    super();
  }

  async process(job: Job<{ appointmentId: string }>): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: job.data.appointmentId },
      include: { customer: true },
    });
    if (!appt || appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') return;

    const dateStr = appt.startsAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const customer = appt.customer;

    await this.mailService.send(
      customer.email,
      'Lembrete de agendamento',
      `<p>Olá ${customer.name}, lembrete: você tem um agendamento amanhã às ${dateStr}.</p>`,
    );

    if (customer.phone) {
      await this.smsService.send(customer.phone, `Lembrete: você tem agendamento amanhã às ${dateStr}.`);
    }
  }
}
```

- [ ] **Step 5: Create `src/modules/notifications/infrastructure/notifications.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from '../../../shared/services/mail.service';
import { SmsService } from '../../../shared/services/sms.service';
import { QueueService, APPOINTMENT_REMINDER_QUEUE } from '../../../shared/services/queue.service';
import { AppointmentBookedListener } from '../application/appointment-booked.listener';
import { AppointmentCompletedListener } from '../application/appointment-completed.listener';
import { AppointmentCancelledListener } from '../application/appointment-cancelled.listener';
import { AppointmentReminderProcessor } from '../application/appointment-reminder.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: APPOINTMENT_REMINDER_QUEUE }),
  ],
  providers: [
    MailService, SmsService, QueueService,
    AppointmentBookedListener, AppointmentCompletedListener, AppointmentCancelledListener,
    AppointmentReminderProcessor,
  ],
})
export class NotificationsModule {}
```

- [ ] **Step 6: Update `src/app.module.ts`**

Add to `imports`:
```typescript
BullModule.forRoot({
  connection: {
    host: configService.get('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
  },
}),
NotificationsModule,
```

Note: `BullModule.forRoot()` requires access to `ConfigService` — use `BullModule.forRootAsync` with `ConfigModule`:

```typescript
BullModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    connection: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
    },
  }),
  inject: [ConfigService],
}),
```

- [ ] **Step 7: Add REDIS env vars to `.env.example`**

```
REDIS_HOST=localhost
REDIS_PORT=6379
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/notifications/ src/shared/services/ src/app.module.ts .env.example
git commit -m "feat(notifications): add event-driven notifications and BullMQ reminder jobs"
```

---

### Task 4: Loyalty History Endpoint

**Files:** Add to `users` module — new use case, new DTO, extend repository, extend controller

- [ ] **Step 1: Extend `IUsersRepository` with loyalty transaction query**

In `src/modules/users/domain/users.repository.interface.ts`, add:
```typescript
getLoyaltyTransactions(userId: string, params: { page: number; limit: number }): Promise<PaginatedResult<LoyaltyTransactionEntity>>;
```

Where `LoyaltyTransactionEntity` is already defined in `src/modules/appointments/domain/loyalty-transaction.entity.ts` — re-export or import it from there. To avoid cross-module entity imports, define a minimal `LoyaltyTransactionEntity` directly in the users domain:

`src/modules/users/domain/loyalty-transaction.entity.ts`:
```typescript
export class LoyaltyTransactionEntity {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: 'EARNED' | 'REDEEMED';
  points: number;
  createdAt: Date;
}
```

- [ ] **Step 2: Create DTO**

`src/modules/users/dto/loyalty-transaction-response.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyTransactionEntity } from '../domain/loyalty-transaction.entity';

export class LoyaltyTransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() appointmentId: string | null;
  @ApiProperty({ enum: ['EARNED', 'REDEEMED'] }) type: string;
  @ApiProperty() points: number;
  @ApiProperty() createdAt: Date;
}

export function toLoyaltyTransactionResponseDto(e: LoyaltyTransactionEntity): LoyaltyTransactionResponseDto {
  return { id: e.id, userId: e.userId, appointmentId: e.appointmentId, type: e.type, points: e.points, createdAt: e.createdAt };
}
```

- [ ] **Step 3: Write failing test for ListLoyaltyTransactionsUseCase**

`src/modules/users/application/list-loyalty-transactions.use-case.spec.ts`:
```typescript
import { ListLoyaltyTransactionsUseCase } from './list-loyalty-transactions.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';

const mockRepo = (): jest.Mocked<IUsersRepository> => ({
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
  getLoyaltyTransactions: jest.fn(),
});

describe('ListLoyaltyTransactionsUseCase', () => {
  it('returns paginated loyalty transactions for user', async () => {
    const repo = mockRepo();
    repo.getLoyaltyTransactions.mockResolvedValue({ data: [{ id: '1', points: 10 } as any], total: 1, page: 1, limit: 10 });
    const result = await new ListLoyaltyTransactionsUseCase(repo).execute('user1', { page: 1, limit: 10 });
    expect(repo.getLoyaltyTransactions).toHaveBeenCalledWith('user1', { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run test to confirm fail**

```bash
npx jest src/modules/users/application/list-loyalty-transactions.use-case.spec.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 5: Implement use case**

`src/modules/users/application/list-loyalty-transactions.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { LoyaltyTransactionEntity } from '../domain/loyalty-transaction.entity';

@Injectable()
export class ListLoyaltyTransactionsUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}
  async execute(userId: string, params: { page: number; limit: number }): Promise<PaginatedResult<LoyaltyTransactionEntity>> {
    return this.usersRepository.getLoyaltyTransactions(userId, params);
  }
}
```

- [ ] **Step 6: Run test to confirm pass**

```bash
npx jest src/modules/users/application/list-loyalty-transactions.use-case.spec.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 7: Implement `getLoyaltyTransactions` in `UsersRepository`**

In `src/modules/users/infrastructure/users.repository.ts`, add:
```typescript
async getLoyaltyTransactions(userId: string, params: { page: number; limit: number }): Promise<PaginatedResult<LoyaltyTransactionEntity>> {
  const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
  const [records, total] = await this.prisma.$transaction([
    this.prisma.loyaltyTransaction.findMany({ where: { userId }, skip, take, orderBy: { createdAt: 'desc' } }),
    this.prisma.loyaltyTransaction.count({ where: { userId } }),
  ]);
  return {
    data: records.map((r) => {
      const e = new LoyaltyTransactionEntity();
      e.id = r.id; e.userId = r.userId; e.appointmentId = r.appointmentId;
      e.type = r.type as 'EARNED' | 'REDEEMED'; e.points = r.points; e.createdAt = r.createdAt;
      return e;
    }),
    total, page: params.page, limit: params.limit,
  };
}
```

Import `LoyaltyTransactionEntity` from `'../domain/loyalty-transaction.entity'` at the top.

- [ ] **Step 8: Add endpoint to `UsersController`**

In `src/modules/users/infrastructure/users.controller.ts`, add:
```typescript
@Get('me/loyalty-transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: "List current user's loyalty transaction history" })
@ApiResponse({ status: 200 })
async listLoyaltyTransactions(
  @CurrentUser() user: UserEntity,
  @Query() query: PaginationQueryDto,
) {
  const result = await this.listLoyaltyTransactionsUseCase.execute(user.id, { page: query.page, limit: query.limit });
  return { ...result, data: result.data.map(toLoyaltyTransactionResponseDto) };
}
```

Inject `ListLoyaltyTransactionsUseCase` in the controller constructor. Add it to `UsersModule` providers.

- [ ] **Step 9: Register in UsersModule**

In `src/modules/users/infrastructure/users.module.ts`, add `ListLoyaltyTransactionsUseCase` to providers.

- [ ] **Step 10: Run tests and verify server**

```bash
npm run test
npm run start:dev
```

Verify `GET /users/me/loyalty-transactions` and `GET /settings` appear in http://localhost:3000/api. Verify BullMQ connects to Redis (start Redis locally or with Docker: `docker run -d -p 6379:6379 redis`).

- [ ] **Step 11: Commit**

```bash
git add src/modules/users/ src/modules/settings/
git commit -m "feat(users): add loyalty transaction history endpoint"
```

---

### Task 5: Seed Default Settings & Final Wiring

**Files:** `prisma/seed.ts` (extend), `.env.example` (verify completeness)

- [ ] **Step 1: Add default settings to `prisma/seed.ts`**

At the end of the seed function, add:
```typescript
await prisma.setting.createMany({
  data: [
    { key: 'cancellation_window_hours', value: '24' },
    { key: 'slot_interval_minutes', value: '30' },
    { key: 'loyalty_enabled', value: 'false' },
  ],
  skipDuplicates: true,
});
console.log('Default settings seeded');
```

- [ ] **Step 2: Verify `.env.example` is complete**

Ensure it has all required vars:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/barbershop
JWT_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
RESEND_API_KEY=
MAIL_FROM=noreply@barbershop.app
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET_NAME=
SLOT_INTERVAL_MINUTES=30
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test
npm run build
```

Expected: all tests pass, TypeScript compiles without errors.

- [ ] **Step 4: Final commit**

```bash
git add prisma/seed.ts .env.example
git commit -m "chore: seed default settings and finalize env.example"
```
