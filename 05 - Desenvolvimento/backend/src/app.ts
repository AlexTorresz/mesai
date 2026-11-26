import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { AppError } from './lib/errors.js';
import { authenticate, requireRole } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { configRouter } from './routes/config.js';
import { categoriesRouter } from './routes/categories.js';
import { dishesRouter, unavailabilityRouter, uploadsPath } from './routes/dishes.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter, adminOrdersRouter } from './routes/orders.js';
import { usersRouter } from './routes/users.js';
import { prisma } from './prisma.js';
import { env } from './env.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  // RNF-03 — log apenas de método, rota, status e tempo (sem corpo, sem dados pessoais)
  if (env.nodeEnv !== 'test') app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });

  app.use('/uploads', express.static(uploadsPath, { maxAge: '7d', fallthrough: false }));

  app.use('/api/auth', authRouter);
  app.use('/api/me', authenticate, meRouter);
  app.use('/api/config', authenticate, configRouter);
  app.use('/api/categories', authenticate, categoriesRouter);
  app.use('/api/dishes', authenticate, dishesRouter);
  app.use('/api/unavailability', authenticate, unavailabilityRouter);
  app.use('/api/cart', authenticate, cartRouter);
  app.use('/api/orders', authenticate, ordersRouter);
  app.use('/api/admin/orders', authenticate, requireRole('COLABORADOR', 'GERENTE'), adminOrdersRouter);
  app.use('/api/admin/users', authenticate, requireRole('GERENTE'), usersRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { message: 'Rota não encontrada.', code: 'ROTA_INEXISTENTE' } });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
    }
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'A foto deve ter no máximo 5 MB.' : 'Falha no envio da foto.';
      return res.status(400).json({ error: { message: msg, code: 'UPLOAD' } });
    }
    if (err instanceof SyntaxError && 'body' in (err as object)) {
      return res.status(400).json({ error: { message: 'JSON inválido.', code: 'JSON_INVALIDO' } });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: { message: 'Registro duplicado.', code: 'DUPLICADO' } });
    }
    if ((err as { status?: number })?.status === 404) {
      return res.status(404).json({ error: { message: 'Arquivo não encontrado.', code: 'NAO_ENCONTRADO' } });
    }
    console.error('[erro]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: { message: 'Erro interno. Tente novamente.', code: 'ERRO_INTERNO' } });
  });

  return app;
}
