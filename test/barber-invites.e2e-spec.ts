import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';
import {
  IMailService,
  SendBarberInviteEmailParams,
} from '../src/shared/mail/mail.service';

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
}

interface BarberInviteResponseBody {
  id: string;
}

interface UserMeResponseBody {
  email: string;
  role: string;
}

interface BarberResponseBody {
  id: string;
  commissionPercentage: number;
}

describe('Barber invites (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const ownerEmail = `e2e-invite-owner-${suffix}@example.com`;
  const ownerPassword = 'owner-super-secret';
  const newBarberEmail = `e2e-invite-new-barber-${suffix}@example.com`;
  const existingCustomerEmail = `e2e-invite-existing-customer-${suffix}@example.com`;
  const existingCustomerPassword = 'customer-original-password';
  const allEmails = [ownerEmail, newBarberEmail, existingCustomerEmail];

  const sendBarberInviteEmail = jest
    .fn<Promise<void>, [SendBarberInviteEmailParams]>()
    .mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IMailService)
      .useValue({ sendBarberInviteEmail })
      .compile();

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

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Invite Owner',
        email: ownerEmail,
        password: ownerPassword,
      })
      .expect(201);
    await prisma.user.update({
      where: { email: ownerEmail },
      data: { role: 'OWNER' },
    });
  });

  afterAll(async () => {
    await prisma.barber.deleteMany({
      where: { user: { email: { in: allEmails } } },
    });
    await prisma.barberInvite.deleteMany({
      where: { user: { email: { in: allEmails } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { in: allEmails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: allEmails } } });
    await app.close();
  });

  async function loginAsOwner(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerEmail, password: ownerPassword })
      .expect(200);
    return (res.body as AuthResponseBody).accessToken;
  }

  function lastInviteToken(): string {
    const calls = sendBarberInviteEmail.mock.calls;
    return calls[calls.length - 1][0].token;
  }

  it('sends a new-barber invite, validates it, accepts it, and logs in', async () => {
    const ownerToken = await loginAsOwner();
    const newBarberPassword = 'new-barber-password';

    const sendRes = await request(app.getHttpServer())
      .post('/invites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'New Barber', email: newBarberEmail })
      .expect(201);

    const inviteId = (sendRes.body as BarberInviteResponseBody).id;
    expect(inviteId).toBeDefined();
    expect(sendBarberInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: newBarberEmail, name: 'New Barber' }),
    );

    const token = lastInviteToken();

    const previewRes = await request(app.getHttpServer())
      .get(`/invites/${token}`)
      .expect(200);
    expect(previewRes.body).toEqual(
      expect.objectContaining({ name: 'New Barber', email: newBarberEmail }),
    );

    const acceptRes = await request(app.getHttpServer())
      .post(`/invites/${token}/accept`)
      .send({ password: newBarberPassword })
      .expect(201);

    const barberBody = acceptRes.body as BarberResponseBody;
    expect(barberBody.id).toBeDefined();
    expect(typeof barberBody.commissionPercentage).toBe('number');

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: newBarberEmail, password: newBarberPassword })
      .expect(200);
    const { accessToken } = loginRes.body as AuthResponseBody;

    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meRes.body as UserMeResponseBody).role).toBe('BARBER');

    // the invite is now accepted — a second accept must fail
    await request(app.getHttpServer())
      .post(`/invites/${token}/accept`)
      .send({ password: newBarberPassword })
      .expect(409);
  });

  it('promotes an existing customer without changing their password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Existing Customer',
        email: existingCustomerEmail,
        password: existingCustomerPassword,
      })
      .expect(201);

    const ownerToken = await loginAsOwner();

    await request(app.getHttpServer())
      .post('/invites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Ignored Name', email: existingCustomerEmail })
      .expect(201);

    const token = lastInviteToken();

    await request(app.getHttpServer())
      .post(`/invites/${token}/accept`)
      .send({})
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: existingCustomerEmail,
        password: existingCustomerPassword,
      })
      .expect(200);
    const { accessToken } = loginRes.body as AuthResponseBody;

    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meRes.body as UserMeResponseBody).role).toBe('BARBER');
  });

  it('rejects sending an invite when not authenticated or not an OWNER', async () => {
    await request(app.getHttpServer())
      .post('/invites')
      .send({ name: 'X', email: 'irrelevant@example.com' })
      .expect(401);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: existingCustomerEmail,
        password: existingCustomerPassword,
      })
      .expect(200);
    const { accessToken } = loginRes.body as AuthResponseBody;

    await request(app.getHttpServer())
      .post('/invites')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'X', email: 'irrelevant@example.com' })
      .expect(403);
  });
});
