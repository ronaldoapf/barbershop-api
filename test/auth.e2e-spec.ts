import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = 'super-secret-password';

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
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers, logs in, refreshes, and logs out', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password })
      .expect(201);

    expect(registerRes.body).toHaveProperty('accessToken');
    expect(registerRes.body).toHaveProperty('refreshToken');

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');
    const loginTokens = loginRes.body as AuthResponseBody;

    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${loginTokens.accessToken}`)
      .expect(200);

    expect((meRes.body as { email: string }).email).toBe(email);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginTokens.refreshToken })
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');
    const refreshedTokens = refreshRes.body as AuthResponseBody;
    expect(refreshedTokens.refreshToken).not.toBe(loginTokens.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginTokens.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refreshedTokens.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshedTokens.refreshToken })
      .expect(401);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects unauthenticated access to a protected route', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });
});
