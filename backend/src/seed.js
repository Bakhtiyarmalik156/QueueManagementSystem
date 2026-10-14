require('dotenv').config();
const prisma = require('./db');
const { hashPassword } = require('./utils/auth');

async function main() {
  // Services
  const services = [
    { name: 'General Inquiry', prefix: 'G', color: '#3b82f6' },
    { name: 'Billing', prefix: 'B', color: '#10b981' },
    { name: 'Technical Support', prefix: 'T', color: '#f59e0b' },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { prefix: s.prefix },
      update: {},
      create: s,
    });
  }

  // Counters
  const counterCount = await prisma.counter.count();
  if (counterCount === 0) {
    await prisma.counter.createMany({
      data: [
        { name: 'Counter 1', isOnline: true },
        { name: 'Counter 2', isOnline: true },
        { name: 'Counter 3', isOnline: false },
      ],
    });
  }

  // Users
  const adminExists = await prisma.staff.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
    await prisma.staff.create({
      data: { username: 'admin', passwordHash: await hashPassword('admin123'), role: 'admin' },
    });
  }
  const staffExists = await prisma.staff.findUnique({ where: { username: 'staff' } });
  if (!staffExists) {
    // assign first counter
    const c = await prisma.counter.findFirst();
    await prisma.staff.create({
      data: { username: 'staff', passwordHash: await hashPassword('staff123'), role: 'staff', counterId: c ? c.id : null },
    });
  }

  console.log('Seed complete. Users: admin/admin123, staff/staff123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());