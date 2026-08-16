import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const isLocal =
  process.env.DATABASE_URL?.includes('localhost') ||
  process.env.DATABASE_URL?.includes('127.0.0.1');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(!isLocal && { ssl: { rejectUnauthorized: false } }),
});

const prisma = new PrismaClient({ adapter });

const DEFAULT_OWNER_EMAIL = 'ronaldo.alves.1997@gmail.com';
const DEFAULT_OWNER_PASSWORD = 'akuu3xtot347';

async function main() {
  const email = process.env.OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD ?? DEFAULT_OWNER_PASSWORD;
  const saltRounds = process.env.BCRYPT_SALT_ROUNDS
    ? Number(process.env.BCRYPT_SALT_ROUNDS)
    : 10;

  const existing = await prisma.user.findFirst({ where: { email } });

  let ownerId: string;

  if (existing?.role === UserRole.OWNER) {
    console.log(`Owner already exists (${email}) — skipping user seed.`);
    ownerId = existing.id;
  } else if (existing) {
    // Promote without clobbering a password the user may have set themselves.
    const passwordHash = existing.passwordHash
      ? undefined
      : await bcrypt.hash(password, saltRounds);

    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.OWNER, ...(passwordHash && { passwordHash }) },
    });
    console.log(
      passwordHash
        ? `Existing user promoted to OWNER and password set: ${email}`
        : `Existing user promoted to OWNER (password unchanged): ${email}`,
    );
    ownerId = existing.id;
  } else {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const created = await prisma.user.create({
      data: {
        name: 'Owner',
        email,
        phone: null,
        passwordHash,
        role: UserRole.OWNER,
      },
    });
    console.log(`Owner created: ${email}`);
    ownerId = created.id;
  }

  await ensureOwnerBarberProfile(ownerId);
}

// The OWNER is also an "admin barber" per spec-en.md §2 — make sure they
// have a Barber row so they can take appointments like any other barber.
async function ensureOwnerBarberProfile(userId: string): Promise<void> {
  const existingBarber = await prisma.barber.findFirst({
    where: { userId, disabledAt: null },
  });
  if (existingBarber) {
    console.log('Owner already has a barber profile — skipping.');
    return;
  }

  const defaultCommissionSetting = await prisma.setting.findUnique({
    where: { key: 'default_commission_percentage' },
  });
  const commissionPercentage = defaultCommissionSetting
    ? Number(defaultCommissionSetting.value)
    : 0;

  await prisma.barber.create({ data: { userId, commissionPercentage } });
  console.log('Barber profile created for the owner.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
