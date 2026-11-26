import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Field, FormError } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, ApiError, errorMessage } from '../lib/api';
import { formatCep, formatCpf, formatPhone } from '../lib/format';

type Panel = 'none' | 'register' | 'forgot';

/** Home exclusiva de autenticação; Cadastro e Recuperação abrem sob demanda (Manual, p. 7). */
export default function Login() {
  const { login, notice, clearNotice } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>('none');
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(form.login.trim(), form.password);
      navigate('/cardapio');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b-2 border-ink bg-sidebar px-4 py-3 sm:px-8">
        <div className="flex items-baseline gap-3">
          <Logo light className="text-[28px] leading-none" />
          <span className="hidden font-mono text-[11px] font-bold uppercase tracking-wider text-cream/70 sm:inline">Comanda & Delivery • Cantina 67</span>
        </div>
        <button onClick={toggle} className="badge bg-secondary text-cream" aria-label="Alternar paleta de cores">
          <Palette className="h-3 w-3" /> Paleta: {theme === 'carvao' ? 'Carvão' : 'Creme'}
        </button>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8 sm:py-12">
        {notice ? (
          <div role="alert" className="card flex items-start justify-between gap-3 bg-[#fdf1d8] p-3 text-[13px]">
            <span>{notice}</span>
            <button className="font-mono text-[11px] font-bold uppercase underline" onClick={clearNotice}>
              Ok
            </button>
          </div>
        ) : null}

        <section className="card p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-[26px] font-black tracking-[-0.02em]">Entrar no mesaí</h1>
            <span className="badge bg-mustard text-ink">1 sessão / conta</span>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field label="E-mail ou CPF" autoComplete="username" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="voce@email.com ou 000.000.000-00" />
            <Field label="Senha" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <FormError message={error} />
            <button className="btn-primary w-full" disabled={busy || !form.login || !form.password}>
              {busy ? 'Entrando…' : 'Entrar e acessar cardápio →'}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2">
            <button
              className="flex items-center justify-between rounded-ctl border-2 border-ink bg-white px-3 py-2 text-left font-semibold"
              aria-expanded={panel === 'register'}
              onClick={() => setPanel(panel === 'register' ? 'none' : 'register')}
            >
              Criar Novo Cadastro <span className="font-mono text-[12px] text-primary-text">[{panel === 'register' ? 'Fechar ×' : 'Abrir →'}]</span>
            </button>
            {panel === 'register' ? <RegisterForm onDone={(email) => { setForm({ login: email, password: '' }); setPanel('none'); }} /> : null}

            <button
              className="flex items-center justify-between rounded-ctl border-2 border-ink bg-white px-3 py-2 text-left font-semibold"
              aria-expanded={panel === 'forgot'}
              onClick={() => setPanel(panel === 'forgot' ? 'none' : 'forgot')}
            >
              Esqueci minha senha <span className="font-mono text-[12px] text-primary-text">[{panel === 'forgot' ? 'Fechar ×' : 'Recuperar →'}]</span>
            </button>
            {panel === 'forgot' ? <ForgotForm /> : null}
          </div>
        </section>
        <p className="text-center text-[12px] text-on-app-muted">Pagamento sempre na entrega: Pix, crédito, débito, vale-refeição ou dinheiro.</p>
      </main>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: (email: string) => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '', confirm: '', cpf: '', cep: '', number: '', complement: '', reference: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    const req: [keyof typeof f, string][] = [['name', 'Nome completo'], ['phone', 'Telefone'], ['email', 'E-mail'], ['password', 'Senha'], ['cpf', 'CPF'], ['cep', 'CEP'], ['number', 'Número']];
    for (const [k, l] of req) if (!f[k].trim()) errs[k] = `${l} é obrigatório.`;
    if (f.password && f.password.length < 8) errs.password = 'A senha deve ter ao menos 8 caracteres.';
    if (f.password !== f.confirm) errs.confirm = 'As senhas não conferem.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { confirm: _c, ...body } = f;
      void _c;
      await api('/auth/register', { method: 'POST', body });
      await login(f.email, f.password);
      navigate('/cardapio');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_DUPLICADO') onDone(f.email);
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.campo, d.mensagem])));
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-ctl border-2 border-dashed border-ink/50 bg-white/60 p-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" label="Nome completo" required autoComplete="name" value={f.name} onChange={set('name')} error={errors.name} />
      <Field label="Telefone" required inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: formatPhone(e.target.value) })} error={errors.phone} placeholder="(85) 99999-0000" />
      <Field label="CPF" required inputMode="numeric" className="font-mono" value={f.cpf} onChange={(e) => setF({ ...f, cpf: formatCpf(e.target.value) })} error={errors.cpf} hint="Não poderá ser alterado depois." />
      <Field className="sm:col-span-2" label="E-mail" type="email" required autoComplete="email" value={f.email} onChange={set('email')} error={errors.email} />
      <Field label="Senha" type="password" required autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} hint="Mínimo de 8 caracteres." />
      <Field label="Confirmar senha" type="password" required autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} />
      <Field label="CEP" required inputMode="numeric" autoComplete="postal-code" value={f.cep} onChange={(e) => setF({ ...f, cep: formatCep(e.target.value) })} error={errors.cep} />
      <Field label="Número" required value={f.number} onChange={set('number')} error={errors.number} />
      <Field label="Complemento (opcional)" value={f.complement} onChange={set('complement')} />
      <Field label="Referência (opcional)" value={f.reference} onChange={set('reference')} />
      <div className="sm:col-span-2">
        <FormError message={error} />
      </div>
      <button className="btn-secondary sm:col-span-2" disabled={busy}>
        {busy ? 'Criando conta…' : 'Criar conta'}
      </button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } });
      setMsg(r.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-ctl border-2 border-dashed border-ink/50 bg-white/60 p-4" noValidate>
      <Field label="E-mail cadastrado" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <FormError message={error} />
      {msg ? <p className="rounded-ctl border-2 border-success bg-[#e4f1e3] px-3 py-2 text-[13px] text-success">{msg}</p> : null}
      <button className="btn-secondary" disabled={busy || !email}>
        {busy ? 'Enviando…' : 'Enviar link de redefinição'}
      </button>
    </form>
  );
}
