import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';

interface AuthResponseBody {
  accessToken: string;
}

interface AppointmentResponseBody {
  id: string;
  status: string;
}

describe('Appointments — conflict detection & concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let customerUserId: string;
  let barberUserId: string;
  let barberId: string;
  let serviceId: string;

  const suffix = Date.now();
  const customerEmail = `e2e-appt-customer-${suffix}@example.com`;
  const barberEmail = `e2e-appt-barber-${suffix}@example.com`;
  const password = 'super-secret-password';

  // Tomorrow at UTC midnight — always in the future, always a full day free
  // of any other appointment for this freshly-created barber.
  const testDate = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  })();

  const at = (hours: number, minutes = 0): Date =>
    new Date(testDate.getTime() + (hours * 60 + minutes) * 60_000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E Appt Customer', email: customerEmail, password })
      .expect(201);
    customerToken = (registerRes.body as AuthResponseBody).accessToken;

    const customerUser = await prisma.user.findUniqueOrThrow({
      where: { email: customerEmail },
    });
    customerUserId = customerUser.id;

    const barberUser = await prisma.user.create({
      data: { name: 'E2E Appt Barber', email: barberEmail, role: 'BARBER' },
    });
    barberUserId = barberUser.id;

    const barber = await prisma.barber.create({
      data: { userId: barberUser.id, commissionPercentage: 30 },
    });
    barberId = barber.id;

    const service = await prisma.service.create({
      data: {
        name: 'E2E Haircut',
        price: 5000,
        durationMinutes: 30,
        order: 1,
      },
    });
    serviceId = service.id;

    await prisma.barberService.create({ data: { barberId, serviceId } });

    await prisma.barberWorkingHours.create({
      data: {
        barberId,
        type: 'SPECIFIC_DATE',
        date: testDate,
        startTime: '00:00',
        endTime: '23:59',
        isWorking: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.loyaltyTransaction.deleteMany({
      where: { customerId: customerUserId },
    });
    await prisma.appointmentService.deleteMany({
      where: { appointment: { barberId } },
    });
    await prisma.appointment.deleteMany({ where: { barberId } });
    await prisma.barberWorkingHours.deleteMany({ where: { barberId } });
    await prisma.barberService.deleteMany({ where: { barberId } });
    await prisma.service.delete({ where: { id: serviceId } });
    await prisma.barber.delete({ where: { id: barberId } });
    await prisma.session.deleteMany({ where: { userId: customerUserId } });
    await prisma.user.deleteMany({
      where: { id: { in: [customerUserId, barberUserId] } },
    });
    await app.close();
  });

  const book = (startsAt: Date) =>
    request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        barberId,
        serviceIds: [serviceId],
        startsAt: startsAt.toISOString(),
      });

  it('books successfully within the barber’s working hours', async () => {
    const res = await book(at(9, 0)).expect(201);
    expect((res.body as AppointmentResponseBody).status).toBe('PENDING');
  });

  it('rejects a booking that overlaps an existing one', async () => {
    await book(at(9, 15)).expect(409);
  });

  it('allows a booking that starts exactly when another ends (adjacent, not overlapping)', async () => {
    // the 09:00 booking occupies [09:00, 09:30); this starts at 09:30
    await book(at(9, 30)).expect(201);
  });

  it('allows a booking that ends exactly when another starts (exact boundary)', async () => {
    // this occupies [08:30, 09:00), ending exactly when the 09:00 booking starts
    await book(at(8, 30)).expect(201);
  });

  it('under real concurrency, exactly one of two simultaneous requests for the same slot succeeds', async () => {
    const slot = at(14, 0);

    const [first, second] = await Promise.all([book(slot), book(slot)]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);

    const count = await prisma.appointment.count({
      where: { barberId, startsAt: slot },
    });
    expect(count).toBe(1);
  });
});
