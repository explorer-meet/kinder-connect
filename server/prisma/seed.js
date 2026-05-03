const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Super Admin...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@kinderconnect.com' },
  });

  if (existingAdmin) {
    console.log('✅ Super Admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@kinderconnect.com',
      phone: '9999999999',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
    },
  });

  console.log('✅ Super Admin created:', superAdmin.email);
  console.log('   Password: SuperAdmin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
