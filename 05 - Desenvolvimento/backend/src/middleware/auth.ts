import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { AppError, forbidden, unauthorized } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

export const COOKIE_NAME = 'mesai_session';

export function signSession(sessionId: string, userId: string) {
  return jwt.sign({ sid: sessionId, uid: userId }, env.jwtSecret, { expiresIn: '12h' });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

function readToken(req: Request): string | null {
  const fromCookie = req.cookies?.[COOKIE_NAME];
  if (fromCookie) return fromCookie;
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return null;
}

/**
 * RN-06 / RF-06 / RF-07 — sessão única e logout por inatividade, validados no servidor.
 * Requisições de atualização automática (polling) enviam o cabeçalho `X-Mesai-Background: 1`
 * e NÃO contam como atividade do usuário.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) throw unauthorized();
  let payload: { sid: string; uid: string };
  try {
    payload = jwt.verify(token, env.jwtSecret) as { sid: string; uid: string };
  } catch {
    throw unauthorized('Sessão inválida. Entre novamente.', 'SESSAO_INVALIDA');
  }
  const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
  if (!session || session.userId !== payload.uid) throw unauthorized('Sessão inválida. Entre novamente.', 'SESSAO_INVALIDA');

  if (session.revokedAt) {
    if (session.revokedReason === 'NOVO_LOGIN')
      throw unauthorized('Sua sessão foi encerrada porque sua conta entrou em outro dispositivo.', 'SESSAO_SUBSTITUIDA');
    if (session.revokedReason === 'INATIVIDADE')
      throw unauthorized('Sua sessão expirou por inatividade. Entre novamente.', 'SESSAO_EXPIRADA');
    throw unauthorized('Sessão encerrada. Entre novamente.', 'SESSAO_ENCERRADA');
  }

  const idleMs = Date.now() - session.lastActivityAt.getTime();
  if (idleMs > env.inactivityMinutes * 60_000) {
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date(), revokedReason: 'INATIVIDADE' } });
    throw unauthorized('Sua sessão expirou por inatividade. Entre novamente.', 'SESSAO_EXPIRADA');
  }

  if (req.header('x-mesai-background') !== '1') {
    await prisma.session.update({ where: { id: session.id }, data: { lastActivityAt: new Date() } });
  }

  req.user = session.user;
  req.sessionId = session.id;
  next();
}

/** RF-08 / RNF-02 — autorização por perfil sempre no backend. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

export function currentUser(req: Request): User {
  if (!req.user) throw new AppError(401, 'Não autenticado.', 'NAO_AUTENTICADO');
  return req.user;
}
