import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { parse } from '../lib/validate.js';
import { money } from '../lib/money.js';
import { requireRole } from '../middleware/auth.js';

export const configRouter = Router();

export async function getConfig() {
  return (await prisma.storeConfig.findUnique({ where: { id: 1 } })) ?? prisma.storeConfig.create({ data: { id: 1 } });
}

const view = (c: Awaited<ReturnType<typeof getConfig>>) => ({
  storeName: c.storeName,
  address: c.address,
  deliveryFee: money(c.deliveryFee),
  estimatedMinutes: c.estimatedMinutes,
});

configRouter.get('/', async (_req, res) => {
  res.json({ config: view(await getConfig()) });
});

// RF-12 (endereço) e RF-13 (taxa de entrega) — exclusivo do Gerente
configRouter.put('/', requireRole('GERENTE'), async (req, res) => {
  const data = parse(
    z.object({
      address: z.string({ required_error: 'Informe o endereço.' }).trim().min(5, 'Informe o endereço completo do estabelecimento.').max(250),
      deliveryFee: z.coerce
        .number({ invalid_type_error: 'Taxa de entrega inválida.' })
        .min(0, 'A taxa de entrega não pode ser negativa.')
        .max(999.99, 'Taxa de entrega muito alta.')
        .refine((v) => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo 2 casas decimais.'),
      estimatedMinutes: z.coerce.number().int('Use minutos inteiros.').min(5, 'Mínimo de 5 minutos.').max(240, 'Máximo de 240 minutos.'),
    }),
    req.body,
  );
  await getConfig();
  const c = await prisma.storeConfig.update({
    where: { id: 1 },
    data: { address: data.address, deliveryFee: data.deliveryFee.toFixed(2), estimatedMinutes: data.estimatedMinutes },
  });
  res.json({ config: view(c) });
});
