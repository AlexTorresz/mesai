import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Field, FormError } from '../components/ui';
import { api, errorMessage } from '../lib/api';

/** RF-05 — o token chega no fragmento (#token=...) e nunca é enviado em URL ao servidor. */
export default function ResetPassword() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('A senha deve ter ao menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setBusy(true);
    try {
      const r = await api<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(r.message);
      history.replaceState(null, '', '/redefinir-senha');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4">
      <Logo className="text-center text-[40px]" />
      <section className="card p-6">
        <h1 className="mb-4 font-display text-[24px] font-black">Redefinir senha</h1>
        {!token && !done ? (
          <p className="text-[14px]">Link inválido. Solicite um novo em “Esqueci minha senha”.</p>
        ) : done ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-ctl border-2 border-success bg-[#e4f1e3] px-3 py-2 text-success">{done}</p>
            <Link to="/entrar" className="btn-primary">Ir para o login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field label="Nova senha" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="Mínimo de 8 caracteres." />
            <Field label="Confirmar nova senha" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <FormError message={error} />
            <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
          </form>
        )}
      </section>
      <Link to="/entrar" className="text-center font-mono text-[12px] font-bold uppercase text-on-app-muted underline">Voltar ao login</Link>
    </main>
  );
}
