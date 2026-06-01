import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createRoom, getRoomByCode } from './service';

const router = Router();

router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const room = await createRoom({
    userId: req.user!.userId,
    username: req.user!.username,
  });
  res.json(room);
});

router.get('/:code', authMiddleware, (req: Request, res: Response) => {
  const room = getRoomByCode(req.params.code);
  if (!room) { res.status(404).json({ error: 'Sala no encontrada.' }); return; }
  res.json(room);
});

export default router;
