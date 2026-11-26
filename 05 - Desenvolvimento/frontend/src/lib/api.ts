export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: { campo: string; mensagem: string }[],
  ) {
    super(message);
  }
}

const SESSION_CODES = new Set(['SESSAO_SUBSTITUIDA', 'SESSAO_EXPIRADA', 'SESSAO_INVALIDA', 'SESSAO_ENCERRADA']);

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  /** Atualização automática (polling): não conta como atividade do usuário — RF-07 */
  background?: boolean;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.background) headers['X-Mesai-Background'] = '1';
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method: opts.method ?? 'GET', headers, body, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.', 'SEM_CONEXAO');
  }
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const err = data?.error ?? {};
    const e = new ApiError(res.status, err.message ?? 'Não foi possível concluir a ação.', err.code, err.details);
    if (res.status === 401 && err.code && SESSION_CODES.has(err.code)) {
      window.dispatchEvent(new CustomEvent('mesai:session-ended', { detail: { message: e.message, code: e.code } }));
    }
    throw e;
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Algo deu errado. Tente novamente.';
}
