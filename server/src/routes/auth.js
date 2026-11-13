import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { authenticate, signToken } from '../middleware/auth.js';

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  departmentId: user.departmentId,
  department: user.department
    ? { id: user.department.id, name: user.department.name, code: user.department.code }
    : null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

router.post('/register', async (req, res) => {
  const { name, email, password, departmentCode,role } = req.body;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    typeof password !== 'string' ||
    password.length > 72 ||
    !departmentCode||
    !['STUDENT', 'FACULTY'].includes(role)
  ) {
    return res.status(400).json({ message: 'Name, email, password, and department code are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const department = await prisma.department.findUnique({ where: { code: String(departmentCode).trim().toUpperCase() } });

  if (!department) {
    return res.status(400).json({ message: 'Department code not found' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
        role: role,
        departmentId: department.id,
      },
      include: { department: true },
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'A user with this email already exists' });
    throw error;
  }

  const token = signToken(user);

  return res.status(201).json({
    token,
    user: sanitizeUser(user),
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { department: true },
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signToken(user);

  return res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { department: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user) });
});

export default router;
