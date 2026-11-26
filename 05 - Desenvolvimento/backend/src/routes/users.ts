import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { parse } from '../lib/validate.js';
import { forbidden, notFound } from '../lib/errors.js';
import { publicUser } from '../lib/serialize.js';
import { currentUser } from '../middleware/auth.js';

export const usersRouter = Router(); // montado com requireRole('GERENTE')

usersRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
      : undefined,
    orderBy: [{ role: 'desc' }, { name: 'asc' }],
    take: 200,
  });
  // RNF-03 — CPF mascarado na listagem administrativa
  res.json({ users: users.map((u) => publicUser(u)) });
});

// RF-10 / RN-07 — mudança de perfil apenas por Gerente; Gerente seed protegido
usersRouter.patch('/:id/role', async (req, res) => {
  const me = currentUser(req);
  const { role } = parse(
    z.object({ role: z.enum(['CLIENTE', 'COLABORADOR', 'GERENTE'], { errorMap: () => ({ message: 'Perfil inválido.' }) }) }),
    req.body,
  );
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) throw notFound('Usuário não encontrado.');
  if (target.isSeed) throw forbidden('O Gerente padrão do sistema não pode ter o perfil alterado.');
  const user = await prisma.user.update({ where: { id: target.id }, data: { role } });
  res.json({ user: publicUser(user), selfChanged: me.id === target.id });
});
