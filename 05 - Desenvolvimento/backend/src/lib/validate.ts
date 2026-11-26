import { z, ZodError } from 'zod';
import { badRequest } from './errors.js';

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      throw badRequest(first?.message ?? 'Dados inválidos.', 'VALIDACAO', e.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })));
    }
    throw e;
  }
}

const trimmed = (label: string, max = 200) =>
  z.string({ required_error: `${label} é obrigatório.`, invalid_type_error: `${label} é obrigatório.` })
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `${label} é muito longo.`);

export const fields = {
  name: trimmed('Nome completo', 120).refine((v) => v.split(/\s+/).length >= 2, 'Informe o nome completo (nome e sobrenome).'),
  phone: trimmed('Telefone', 20).refine((v) => v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 11, 'Telefone inválido: informe DDD + número.'),
  email: trimmed('E-mail', 160).email('E-mail inválido.').transform((v) => v.toLowerCase()),
  password: z.string({ required_error: 'Senha é obrigatória.' }).min(8, 'A senha deve ter ao menos 8 caracteres.').max(72, 'Senha muito longa.'),
  cep: trimmed('CEP', 9).refine((v) => v.replace(/\D/g, '').length === 8, 'CEP inválido: informe 8 dígitos.').transform((v) => v.replace(/\D/g, '')),
  number: trimmed('Número', 10),
  optionalText: z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null)),
  required: trimmed,
};
