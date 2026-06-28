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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
