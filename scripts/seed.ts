import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@ecoroute.ai';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo User', hashedPassword },
  });

  const trip = await prisma.trip.create({
    data: {
      origin: 'San Francisco',
      destination: 'Los Angeles',
      budget: 200,
      dateStart: new Date(),
      dateEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: user.id,
      options: {
        create: [
          { mode: 'train', cost: 80, durationMins: 420, co2Kg: 18.5, ecoScore: 85 },
          { mode: 'bus', cost: 45, durationMins: 480, co2Kg: 22.1, ecoScore: 78 },
          { mode: 'flight', cost: 130, durationMins: 90, co2Kg: 95.4, ecoScore: 32 },
        ],
      },
    },
  });

  console.log('Seeded user:', user.email);
  console.log('Seeded trip:', trip.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

