import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const categories = ['PROGRAMMING', 'DATABASE', 'WEB', 'DEVOPS', 'AI', 'SOFT_SKILLS'];
const proficiencies = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const includeSkill = {
  student: { select: { id: true, name: true, email: true, departmentId: true } },
  reviews: {
    include: { faculty: { select: { id: true, name: true } } },
    orderBy: { reviewedAt: 'desc' },
  },
};

const cleanSkillInput = (body, existing = {}) => {
  const skillName = body.skillName ?? existing.skillName;
  const category = body.category ?? existing.category;
  const proficiency = body.proficiency ?? existing.proficiency;
  const description = body.description ?? existing.description;
  const evidenceValue = body.evidenceUrl ?? existing.evidenceUrl ?? null;
  const evidenceUrl = typeof evidenceValue === 'string' && !evidenceValue.trim() ? null : evidenceValue;

  if (
    typeof skillName !== 'string' ||
    !skillName.trim() ||
    skillName.trim().length > 100 ||
    !categories.includes(category) ||
    !proficiencies.includes(proficiency) ||
    typeof description !== 'string' ||
    !description.trim() ||
    description.trim().length > 2000
  ) {
    return { error: 'Provide a skill name, valid category and proficiency, and a description (up to 2,000 characters).' };
  }

  if (evidenceUrl !== null) {
    if (typeof evidenceUrl !== 'string') return { error: 'Evidence must be a valid http or https URL.' };
    try {
      const url = new URL(evidenceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    } catch {
      return { error: 'Evidence must be a valid http or https URL.' };
    }
  }

  return {
    data: {
      skillName: skillName.trim(),
      category,
      proficiency,
      description: description.trim(),
      evidenceUrl: evidenceUrl ? evidenceUrl.trim() : null,
    },
  };
};

router.use(authenticate);

router.post('/', requireRole('STUDENT'), async (req, res) => {
  const result = cleanSkillInput(req.body);
  if (result.error) return res.status(400).json({ message: result.error });

  const skill = await prisma.skill.create({
    data: { ...result.data, studentId: req.user.id },
    include: includeSkill,
  });
  return res.status(201).json({ skill });
});

router.get('/my', requireRole('STUDENT'), async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: { studentId: req.user.id },
    include: includeSkill,
    orderBy: { updatedAt: 'desc' },
  });
  return res.json({ skills });
});

router.get('/:id', async (req, res) => {
  const skill = await prisma.skill.findUnique({
    where: { id: req.params.id },
    include: includeSkill,
  });
  if (!skill) return res.status(404).json({ message: 'Skill not found' });

  const canAccess = req.user.role === 'STUDENT'
    ? skill.studentId === req.user.id
    : skill.student.departmentId === req.user.departmentId;
  if (!canAccess) return res.status(403).json({ message: 'You cannot access this skill.' });
  return res.json({ skill });
});

router.put('/:id', requireRole('STUDENT'), async (req, res) => {
  const existing = await prisma.skill.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Skill not found' });
  if (existing.studentId !== req.user.id) {
    return res.status(403).json({ message: 'You can only edit your own submissions.' });
  }
  if (existing.status !== 'REJECTED') {
    return res.status(400).json({ message: 'Only rejected submissions can be edited and resubmitted.' });
  }

  const result = cleanSkillInput(req.body, existing);
  if (result.error) return res.status(400).json({ message: result.error });

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.skill.updateMany({
      where: { id: existing.id, studentId: req.user.id, status: 'REJECTED' },
      data: { ...result.data, status: 'PENDING' },
    });
    if (changed.count !== 1) return null;
    return tx.skill.findUnique({ where: { id: existing.id }, include: includeSkill });
  });

  if (!updated) return res.status(409).json({ message: 'This submission changed while you were editing it. Reload and try again.' });
  return res.json({ skill: updated });
});

export default router;
