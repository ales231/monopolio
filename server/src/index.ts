import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import authRouter from './auth/router';
import usersRouter from './users/router';
import roomsRouter from './rooms/router';
import { initSockets } from './sockets/index';

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
// En Codespaces o producción se puede setear CORS_ORIGIN=* en el .env
const corsOrigin = process.env.CORS_ORIGIN ?? CLIENT_URL;

const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: corsOrigin !== '*' },
});

// Ensure uploads dir exists
const uploadsDir = process.env.UPLOAD_DIR ?? './uploads';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({ origin: corsOrigin, credentials: corsOrigin !== '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

initSockets(io);

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`🎲 Juego de Varones server corriendo en http://localhost:${PORT}`);
});
