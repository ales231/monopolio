import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR ?? './uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { stats: true },
  });
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado.' }); return; }
  res.json({ id: user.id, username: user.username, avatarUrl: user.avatarUrl, stats: user.stats });
});

router.post('/avatar', authMiddleware, upload.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No se subió ningún archivo.' }); return; }
  const avatarUrl = `/uploads/${req.file.filename}`;
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl },
  });
  res.json({ avatarUrl });
});

export default router;
