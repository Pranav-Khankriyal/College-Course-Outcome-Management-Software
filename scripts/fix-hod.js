import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'hod.csbs@bvdu.edu.in' } });
  if (!user) {
    console.log('User hod.csbs@bvdu.edu.in not found');
    return;
  }

  const dept = await prisma.department.findFirst({ where: { code: 'CSBS' } });
  if (!dept) {
    console.log('Department CSBS not found');
    return;
  }

  await prisma.department.update({
    where: { id: dept.id },
    data: { hodId: user.id }
  });

  // Also ensure the HOD is connected to the department in the users's departments list
  await prisma.user.update({
    where: { id: user.id },
    data: {
      departments: {
        connect: { id: dept.id }
      }
    }
  });

  console.log(`Successfully assigned ${user.name} as HOD of ${dept.code}`);
}

main().finally(() => prisma.$disconnect());
