import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { fields, parse } from '../lib/validate.js';
import { isValidCpf, onlyDigits } from '../lib/cpf.js';
import { hashPassword, checkPassword } from '../lib/password.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { publicUser } from '../lib/serialize.js';
import { authenticate, COOKIE_NAME, currentUser, setSessionCookie, signSession } from '../middleware/auth.js';
import { sendMail } from '../lib/mailer.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: fields.name,
  phone: fields.phone,
  email: fields.email,
  password: fields.password,
  cpf: fields.required('CPF', 14),
  cep: fields.cep,
  number: fields.number,
  complement: fields.optionalText,
  reference: fields.optionalText,
});

// RF-01, RF-02, RF-03
authRouter.post('/register', async (req, res) => {
  const data = parse(registerSchema, req.body);
  const cpf = onlyDigits(data.cpf);
  if (!isValidCpf(cpf)) throw badRequest('CPF inválido. Confira os dígitos.', 'CPF_INVALIDO');

  const [byEmail, byCpf] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.user.findUnique({ where: { cpf } }),
  ]);
  if (byEmail) throw conflict('Este e-mail já está cadastrado.', 'EMAIL_DUPLICADO');
  if (byCpf) throw conflict('Este CPF já está cadastrado.', 'CPF_DUPLICADO');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      cpf,
      cep: data.cep,
      number: data.number,
      complement: data.complement,
      reference: data.reference,
      role: 'CLIENTE',
    },
  });
  res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({
  login: z.string({ required_error: 'Informe e-mail ou CPF.' }).trim().min(1, 'Informe e-mail ou CPF.'),
  password: z.string({ required_error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
});

// RF-04 + RF-06 (novo login derruba sessões anteriores)
authRouter.post('/login', async (req, res) => {
  const { login, password } = parse(loginSchema, req.body);
  const isEmail = login.includes('@');
  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: login.toLowerCase() } })
    : await prisma.user.findUnique({ where: { cpf: onlyDigits(login) } });

  // Mensagem genérica: não revela qual campo falhou
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    throw unauthorized('E-mail/CPF ou senha incorretos.', 'CREDENCIAIS_INVALIDAS');
  }

  const session = await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'NOVO_LOGIN' },
    });
    return tx.session.create({ data: { userId: user.id } });
  });

  const token = signSession(session.id, user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user, { fullCpf: true }), inactivityMinutes: env.inactivityMinutes });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  await prisma.session.update({ where: { id: req.sessionId! }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } });
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(currentUser(req), { fullCpf: true }), inactivityMinutes: env.inactivityMinutes });
});

// RF-05 / RN-11 — recuperação de senha por link de uso único (30 min)
const GENERIC_FORGOT = 'Se o e-mail estiver cadastrado, enviaremos um link de redefinição válido por 30 minutos.';

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = parse(z.object({ email: fields.email }), req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ message: GENERIC_FORGOT });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + env.resetTokenMinutes * 60_000) },
  });
  // Token no fragmento (#) da URL: não é enviado ao servidor nem gravado em logs de acesso.
  const link = `${env.appUrl}/redefinir-senha#token=${token}`;
  const result = await sendMail(
    user.email,
    'Mesaí — redefinição de senha',
    `<p>Olá, ${user.name.split(' ')[0]}.</p><p>Para redefinir sua senha, acesse o link abaixo. Ele vale por ${env.resetTokenMinutes} minutos e só pode ser usado uma vez.</p><p><a href="${link}">${link}</a></p><p>Se não foi você, ignore este e-mail.</p>`,
    `Para redefinir sua senha acesse: ${link} (válido por ${env.resetTokenMinutes} minutos, uso único).`,
  );
  // Em testes automatizados (sem SMTP), o token é devolvido apenas quando NODE_ENV=test.
  res.json({ message: GENERIC_FORGOT, ...(env.nodeEnv === 'test' && !result.sent ? { devToken: token } : {}) });
});

authRouter.post('/reset-password', async (req, res) => {
  const { token, password } = parse(
    z.object({ token: z.string().min(10, 'Link inválido.'), password: fields.password }),
    req.body,
  );
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) throw badRequest('Link de redefinição inválido.', 'LINK_INVALIDO');
  if (record.usedAt) throw badRequest('Este link já foi utilizado. Solicite um novo.', 'LINK_USADO');
  if (record.expiresAt.getTime() < Date.now()) throw badRequest('Este link expirou. Solicite um novo.', 'LINK_EXPIRADO');

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'SENHA_REDEFINIDA' },
    }),
  ]);
  res.json({ message: 'Senha redefinida. Entre com a nova senha.' });
});
