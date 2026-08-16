import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const isLocal =
  process.env.DATABASE_URL?.includes('localhost') ||
  process.env.DATABASE_URL?.includes('127.0.0.1');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(!isLocal && { ssl: { rejectUnauthorized: false } }),
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.OWNER_EMAIL ?? 'ronaldo.alves.1997@gmail.com';
  const password = process.env.OWNER_PASSWORD ?? 'akuu3xtot347';

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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
