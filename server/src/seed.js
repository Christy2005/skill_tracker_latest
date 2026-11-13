import prisma from './lib/prisma.js';
import bcrypt from 'bcrypt';

const departments = [
  { name: 'Computer Science', code: 'CSE' },
  { name: 'Electronics and Communication', code: 'ECE' },
  { name: 'Mechanical Engineering', code: 'MECH' },
  { name: 'Information Technology', code: 'IT' },
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed script must not be run in production.');
  }

  for (const department of departments) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name },
      create: department,
    });
  }

  const cseDepartment = await prisma.department.findUnique({ where: { code: 'CSE' } });

  const facultyPassword = await bcrypt.hash('faculty123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@skilltrack.com' },
    update: {},
    create: {
      name: 'Dr. Riya Sharma',
      email: 'faculty@skilltrack.com',
      passwordHash: facultyPassword,
      role: 'FACULTY',
      departmentId: cseDepartment.id,
    },
  });

  const studentOne = await prisma.user.upsert({
    where: { email: 'student1@skilltrack.com' },
    update: {},
    create: {
      name: 'Aman Verma',
      email: 'student1@skilltrack.com',
      passwordHash: studentPassword,
      role: 'STUDENT',
      departmentId: cseDepartment.id,
    },
  });

  const studentTwo = await prisma.user.upsert({
    where: { email: 'student2@skilltrack.com' },
    update: {},
    create: {
      name: 'Neha Gupta',
      email: 'student2@skilltrack.com',
      passwordHash: studentPassword,
      role: 'STUDENT',
      departmentId: cseDepartment.id,
    },
  });

  await prisma.skill.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      skillName: 'React Applications',
      category: 'WEB',
      proficiency: 'INTERMEDIATE',
      description: 'Built multiple SPA dashboards using React and state management.',
      evidenceUrl: 'https://github.com/skilltrack/demo-project',
      status: 'PENDING',
      studentId: studentOne.id,
    },
  });

  await prisma.skill.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      skillName: 'Node.js APIs',
      category: 'PROGRAMMING',
      proficiency: 'ADVANCED',
      description: 'Created secure REST APIs with JWT auth and validation.',
      evidenceUrl: 'https://github.com/skilltrack/api-demo',
      status: 'APPROVED',
      studentId: studentTwo.id,
    },
  });

  await prisma.skillReview.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      skillId: '00000000-0000-0000-0000-000000000002',
      facultyId: faculty.id,
      status: 'APPROVED',
      comments: 'Strong implementation and good API security practices.',
    },
  });

  console.log('Seed complete');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
