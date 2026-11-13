import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import skillRoutes from './routes/skills.js';
import facultyRoutes from './routes/faculty.js';
import prisma from './lib/prisma.js';

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '25kb' }));
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, status: 'healthy' });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({ ok: false, message: 'Database unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/faculty', facultyRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const start = async () => {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`SkillTrack API running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Could not start SkillTrack API:', error);
  process.exitCode = 1;
});
