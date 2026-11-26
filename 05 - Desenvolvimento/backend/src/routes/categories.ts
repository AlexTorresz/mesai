import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { parse, fields } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { requireRole } from '../middleware/auth.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  res.json({ categories: categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })) });
});

const schema = z.object({ name: fields.required('Nome da categoria', 60), sortOrder: z.coerce.number().int().min(0).max(999).optional() });

async function assertUniqueName(name: string, ignoreId?: string) {
  const dup = await prisma.category.findFirst({
    where: { deletedAt: null, name: { equals: name, mode: 'insensitive' }, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
  });
  if (dup) throw conflict('Já existe uma categoria com esse nome.', 'CATEGORIA_DUPLICADA');
}

// RF-15 — CRUD de categorias (Gerente)
categoriesRouter.post('/', requireRole('GERENTE'), async (req, res) => {
  const data = parse(schema, req.body);
  await assertUniqueName(data.name);
  const c = await prisma.category.create({ data: { name: data.name, sortOrder: data.sortOrder ?? 0 } });
  res.status(201).json({ category: { id: c.id, name: c.name, sortOrder: c.sortOrder } });
});

categoriesRouter.put('/:id', requireRole('GERENTE'), async (req, res) => {
  const data = parse(schema, req.body);
  const id = String(req.params.id);
  const existing = await prisma.category.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Categoria não encontrada.');
  await assertUniqueName(data.name, id);
  const c = await prisma.category.update({ where: { id }, data: { name: data.name, sortOrder: data.sortOrder ?? existing.sortOrder } });
  res.json({ category: { id: c.id, name: c.name, sortOrder: c.sortOrder } });
});

categoriesRouter.delete('/:id', requireRole('GERENTE'), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.category.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Categoria não encontrada.');
  const active = await prisma.dish.count({ where: { categoryId: id, deletedAt: null } });
  if (active > 0) throw conflict(`A categoria possui ${active} prato(s) ativo(s). Mova ou exclua os pratos antes.`, 'CATEGORIA_COM_PRATOS');
  await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
});
