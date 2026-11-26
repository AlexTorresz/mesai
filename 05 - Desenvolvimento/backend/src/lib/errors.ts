export class AppError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: unknown) {
    super(message);
  }
}
export const badRequest = (msg: string, code?: string, details?: unknown) => new AppError(400, msg, code, details);
export const unauthorized = (msg = 'Não autenticado.', code = 'NAO_AUTENTICADO') => new AppError(401, msg, code);
export const forbidden = (msg = 'Acesso negado para o seu perfil.') => new AppError(403, msg, 'ACESSO_NEGADO');
export const notFound = (msg = 'Registro não encontrado.') => new AppError(404, msg, 'NAO_ENCONTRADO');
export const conflict = (msg: string, code?: string) => new AppError(409, msg, code ?? 'CONFLITO');
