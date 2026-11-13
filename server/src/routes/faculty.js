import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('FACULTY'));

router.get('/students', async (req, res) => {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', departmentId: req.user.departmentId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      skills: {
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return res.json({
    students: students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      department: student.department,
      skillCount: student.skills.length,
      approvedCount: student.skills.filter((skill) => skill.status === 'APPROVED').length,
      pendingCount: student.skills.filter((skill) => skill.status === 'PENDING').length,
      rejectedCount: student.skills.filter((skill) => skill.status === 'REJECTED').length,
      skills: student.skills,
    })),
  });
});

router.get('/submissions', async (req, res) => {
  const submissions = await prisma.skill.findMany({
    where: { student: { departmentId: req.user.departmentId } },
    include: {
      student: { select: { id: true, name: true, email: true, departmentId: true } },
      reviews: {
        include: { faculty: { select: { id: true, name: true } } },
        orderBy: { reviewedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return res.json({ submissions });
});

router.get('/stats', async (req, res) => {
  const [totalStudents, totalSkills, pendingReviews, approvedSkills, rejectedSkills, departmentStats] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', departmentId: req.user.departmentId } }),
    prisma.skill.count({ where: { student: { departmentId: req.user.departmentId } } }),
    prisma.skill.count({ where: { student: { departmentId: req.user.departmentId }, status: 'PENDING' } }),
    prisma.skill.count({ where: { student: { departmentId: req.user.departmentId }, status: 'APPROVED' } }),
    prisma.skill.count({ where: { student: { departmentId: req.user.departmentId }, status: 'REJECTED' } }),
    prisma.skill.groupBy({
      by: ['category'],
      where: { student: { departmentId: req.user.departmentId } },
      _count: true,
    }),
  ]);

  const studentsOverview = await prisma.user.findMany({
    where: { role: 'STUDENT', departmentId: req.user.departmentId },
    include: {
      skills: true,
    },
  });

  return res.json({
    totalStudents,
    totalSkills,
    pendingReviews,
    approvedSkills,
    rejectedSkills,
    departmentStats,
    studentsOverview: studentsOverview.map((student) => ({
      id: student.id,
      name: student.name,
      totalSkills: student.skills.length,
      approved: student.skills.filter((skill) => skill.status === 'APPROVED').length,
      pending: student.skills.filter((skill) => skill.status === 'PENDING').length,
      rejected: student.skills.filter((skill) => skill.status === 'REJECTED').length,
    })),
  });
});

router.patch('/skills/:skillId/review', async (req, res) => {
  const { skillId } = req.params;
  const { decision, comments } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be APPROVED or REJECTED' });
  }

  if (decision === 'REJECTED' && (typeof comments !== 'string' || !comments.trim())) {
    return res.status(400).json({ message: 'Feedback is required when rejecting a skill' });
  }
  if (comments !== undefined && (typeof comments !== 'string' || comments.length > 2000)) {
    return res.status(400).json({ message: 'Feedback must be text no longer than 2,000 characters.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingSkill = await tx.skill.findUnique({
        where: { id: skillId },
        include: { student: { select: { departmentId: true } } },
      });

      if (!existingSkill) return { error: 'NOT_FOUND' };
      if (existingSkill.student.departmentId !== req.user.departmentId) return { error: 'FORBIDDEN' };
      if (existingSkill.status !== 'PENDING') return { error: 'NOT_PENDING' };

      const update = await tx.skill.updateMany({
        where: { id: existingSkill.id, status: 'PENDING' },
        data: { status: decision },
      });
      if (update.count !== 1) return { error: 'NOT_PENDING' };

      const review = await tx.skillReview.create({
        data: {
          skillId: existingSkill.id,
          facultyId: req.user.id,
          status: decision,
          comments: comments ? String(comments).trim() : null,
        },
      });
      const updatedSkill = await tx.skill.findUnique({
        where: { id: existingSkill.id },
        include: {
          student: { select: { id: true, name: true, email: true, departmentId: true } },
          reviews: {
            include: { faculty: { select: { id: true, name: true } } },
            orderBy: { reviewedAt: 'desc' },
          },
        },
      });

      return { review, skill: updatedSkill };
    });

    if (result.error === 'NOT_FOUND') return res.status(404).json({ message: 'Skill not found' });
    if (result.error === 'FORBIDDEN') return res.status(403).json({ message: 'You can only review skills from your department' });
    if (result.error === 'NOT_PENDING') return res.status(409).json({ message: 'This skill is no longer pending review' });
    return res.json({ message: 'Skill review saved', review: result.review, skill: result.skill });
  } catch (error) {
    console.error('Skill review transaction failed:', error);
    return res.status(500).json({ message: 'Could not complete review' });
  }
});

export default router;
