import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { fields, parse } from '../lib/validate.js';
import { badRequest, conflict } from '../lib/errors.js';
import { checkPassword, hashPassword } from '../lib/password.js';
import { publicUser } from '../lib/serialize.js';
import { currentUser } from '../middleware/auth.js';

export const meRouter = Router();

// RF-09 — o CPF não está no schema, portanto não é editável (RN-10)
const profileSchema = z
  .object({
    name: fields.name,
    phone: fields.phone,
    email: fields.email,
    cep: fields.cep,
    number: fields.number,
    complement: fields.optionalText,
    reference: fields.optionalText,
  })
  .strict('Campo não permitido na edição do perfil (o CPF não pode ser alterado).');

meRouter.put('/', async (req, res) => {
  const me = currentUser(req);
  const data = parse(profileSchema, req.body);
  if (data.email !== me.email) {
    const other = await prisma.user.findUnique({ where: { email: data.email } });
    if (other && other.id !== me.id) throw conflict('Este e-mail já está cadastrado.', 'EMAIL_DUPLICADO');
  }
  const user = await prisma.user.update({ where: { id: me.id }, data });
  res.json({ user: publicUser(user, { fullCpf: true }) });
});

meRouter.put('/password', async (req, res) => {
  const me = currentUser(req);
  const { currentPassword, newPassword } = parse(
    z.object({
      currentPassword: z.string({ required_error: 'Informe a senha atual.' }).min(1, 'Informe a senha atual.'),
      newPassword: fields.password,
    }),
    req.body,
  );
  if (!(await checkPassword(currentPassword, me.passwordHash))) throw badRequest('Senha atual incorreta.', 'SENHA_ATUAL_INCORRETA');
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(newPassword) } });
  res.json({ message: 'Senha alterada.' });
});
