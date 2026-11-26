import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { parse, fields } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { publicDish } from '../lib/serialize.js';
import { currentUser, requireRole } from '../middleware/auth.js';

export const dishesRouter = Router();

fs.mkdirSync(env.uploadDir, { recursive: true });
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED.get(file.mimetype) ?? ''}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(badRequest('Foto deve ser JPG, PNG ou WEBP.', 'FOTO_INVALIDA'));
  },
});

const price = z.coerce
  .number({ invalid_type_error: 'Valor inválido.', required_error: 'Valor é obrigatório.' })
  .positive('O valor deve ser maior que zero.')
  .max(99999.99, 'Valor muito alto.')
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo 2 casas decimais.');

// RN-12 — desconto entre 0,1% e 100% (vazio/0 = sem desconto)
const discount = z
  .union([z.literal(''), z.null(), z.coerce.number({ invalid_type_error: 'Desconto inválido.' })])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined || v === 0 ? null : v))
  .refine((v) => v === null || (v >= 0.1 && v <= 100), 'O desconto deve estar entre 0,1% e 100%.')
  .refine((v) => v === null || Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo 2 casas decimais no desconto.');

const photoUrl = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^https?:\/\/.+/i.test(v) || v.startsWith('/uploads/'), 'URL da foto inválida (use http:// ou https://).');

function resolvePhoto(file: Express.Multer.File | undefined, url: string | undefined) {
  if (file) return `/uploads/${file.filename}`;
  if (url) return url;
  return null;
}

async function assertCategory(categoryId: string) {
  const cat = await prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } });
  if (!cat) throw badRequest('Categoria inválida.', 'CATEGORIA_INVALIDA');
}

// RF-14 — cardápio (somente pratos não excluídos de categorias ativas)
dishesRouter.get('/', async (_req, res) => {
  const dishes = await prisma.dish.findMany({
    where: { deletedAt: null, category: { deletedAt: null } },
    include: { category: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  });
  res.json({ dishes: dishes.map(publicDish) });
});

// RF-16 — criação com nome, descrição, valor e foto obrigatórios
dishesRouter.post('/', requireRole('GERENTE'), upload.single('photo'), async (req, res) => {
  const data = parse(
    z.object({
      name: fields.required('Nome do prato', 80),
      description: fields.required('Descrição', 400),
      price,
      categoryId: fields.required('Categoria', 60),
      discountPercent: discount,
      photoUrl,
    }),
    req.body,
  );
  const photo = resolvePhoto(req.file, data.photoUrl);
  if (!photo) throw badRequest('Foto é obrigatória (envie um arquivo ou informe uma URL).', 'FOTO_OBRIGATORIA');
  await assertCategory(data.categoryId);
  const dish = await prisma.dish.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price.toFixed(2),
      categoryId: data.categoryId,
      discountPercent: data.discountPercent === null ? null : data.discountPercent.toFixed(2),
      photoUrl: photo,
    },
    include: { category: true },
  });
  res.status(201).json({ dish: publicDish(dish) });
});

// RF-17 — edição (valor fixo, dados e desconto). Pedidos já feitos não mudam (RN-03).
dishesRouter.put('/:id', requireRole('GERENTE'), upload.single('photo'), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.dish.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Prato não encontrado.');
  const data = parse(
    z.object({
      name: fields.required('Nome do prato', 80),
      description: fields.required('Descrição', 400),
      price,
      categoryId: fields.required('Categoria', 60),
      discountPercent: discount,
      photoUrl,
    }),
    req.body,
  );
  await assertCategory(data.categoryId);
  const photo = resolvePhoto(req.file, data.photoUrl) ?? existing.photoUrl;
  const dish = await prisma.dish.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price.toFixed(2),
      categoryId: data.categoryId,
      discountPercent: data.discountPercent === null ? null : data.discountPercent.toFixed(2),
      photoUrl: photo,
    },
    include: { category: true },
  });
  res.json({ dish: publicDish(dish) });
});

// Aba "Preço / Desconto" (modal com slider)
dishesRouter.patch('/:id/pricing', requireRole('GERENTE'), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.dish.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Prato não encontrado.');
  const data = parse(z.object({ price, discountPercent: discount }), req.body);
  const dish = await prisma.dish.update({
    where: { id },
    data: { price: data.price.toFixed(2), discountPercent: data.discountPercent === null ? null : data.discountPercent.toFixed(2) },
    include: { category: true },
  });
  res.json({ dish: publicDish(dish) });
});

// RF-18 / RN-05 — exclusão lógica confirmando o nome digitado
dishesRouter.delete('/:id', requireRole('GERENTE'), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.dish.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Prato não encontrado.');
  const { confirmName } = parse(z.object({ confirmName: z.string({ required_error: 'Digite o nome do prato para confirmar.' }) }), req.body ?? {});
  if (confirmName.trim() !== existing.name.trim()) {
    throw badRequest('O texto digitado não confere com o nome do prato. Exclusão cancelada.', 'CONFIRMACAO_INVALIDA');
  }
  await prisma.$transaction([
    prisma.dish.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.cartItem.deleteMany({ where: { dishId: id } }),
  ]);
  res.json({ ok: true });
});

// RF-19 / RF-20 — disponibilidade com registro de responsável e data/hora
dishesRouter.patch('/:id/availability', requireRole('COLABORADOR', 'GERENTE'), async (req, res) => {
  const id = String(req.params.id);
  const me = currentUser(req);
  const { available } = parse(z.object({ available: z.boolean({ required_error: 'Informe a disponibilidade.' }) }), req.body);
  const existing = await prisma.dish.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Prato não encontrado.');
  const [dish] = await prisma.$transaction([
    prisma.dish.update({ where: { id }, data: { available }, include: { category: true } }),
    prisma.unavailabilityLog.create({ data: { dishId: id, userId: me.id, available } }),
  ]);
  res.json({ dish: publicDish(dish) });
});

export const unavailabilityRouter = Router();

// RF-20 — painel de indisponibilidades (Gerente)
unavailabilityRouter.get('/', requireRole('GERENTE'), async (_req, res) => {
  const [logs, current] = await Promise.all([
    prisma.unavailabilityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { dish: { select: { name: true, deletedAt: true } }, user: { select: { name: true, role: true } } },
    }),
    prisma.dish.findMany({ where: { available: false, deletedAt: null }, include: { category: true }, orderBy: { name: 'asc' } }),
  ]);
  res.json({
    current: current.map(publicDish),
    logs: logs.map((l) => ({
      id: l.id,
      dishName: l.dish.name,
      dishDeleted: !!l.dish.deletedAt,
      userName: l.user.name,
      userRole: l.user.role,
      available: l.available,
      at: l.createdAt.toISOString(),
    })),
  });
});

export const uploadsPath = path.resolve(env.uploadDir);
