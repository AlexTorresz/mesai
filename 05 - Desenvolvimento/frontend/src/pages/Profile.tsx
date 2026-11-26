import { useState, type FormEvent } from 'react';
import { api, ApiError, errorMessage } from '../lib/api';
import type { User } from '../lib/types';
import { formatCep, formatCpf, formatPhone, ROLE_LABEL } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, FormError } from '../components/ui';

/** RF-09 — edição de dados do usuário (CPF bloqueado; troca de senha exige a atual). */
export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({
    name: user!.name,
    phone: user!.phone,
    email: user!.email,
    cep: formatCep(user!.cep),
    number: user!.number,
    complement: user!.complement ?? '',
    reference: user!.reference ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    setBusy(true);
    try {
      const r = await api<{ user: User }>('/me', { method: 'PUT', body: f });
      setUser(r.user);
      toast('Dados atualizados.');
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.campo, d.mensagem])));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (pw.newPassword.length < 8) return setPwError('A nova senha deve ter ao menos 8 caracteres.');
    if (pw.newPassword !== pw.confirm) return setPwError('As senhas não conferem.');
    try {
      await api('/me/password', { method: 'PUT', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Senha alterada.');
    } catch (err) {
      setPwError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Perfil • {user!.name.split(' ')[0]}</h1>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2" noValidate>
          <h2 className="font-display text-[20px] font-bold sm:col-span-2">Meus dados</h2>
          <Field className="sm:col-span-2" label="Nome completo" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
          <Field label="Telefone" required value={f.phone} onChange={(e) => setF({ ...f, phone: formatPhone(e.target.value) })} error={errors.phone} />
          <Field label="CPF" value={formatCpf(user!.cpf)} disabled className="font-mono" hint="O CPF não pode ser alterado." />
          <Field className="sm:col-span-2" label="E-mail" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
          <Field label="CEP" required value={f.cep} onChange={(e) => setF({ ...f, cep: formatCep(e.target.value) })} error={errors.cep} />
          <Field label="Número" required value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} error={errors.number} />
          <Field label="Complemento" value={f.complement} onChange={(e) => setF({ ...f, complement: e.target.value })} />
          <Field label="Referência" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          <div className="sm:col-span-2">
            <FormError message={error} />
          </div>
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className="badge bg-secondary text-cream">Perfil: {ROLE_LABEL[user!.role]}</span>
            <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar dados'}</button>
          </div>
        </form>
        <form onSubmit={changePassword} className="card flex flex-col gap-3 p-5" noValidate>
          <h2 className="font-display text-[20px] font-bold">Trocar senha</h2>
          <Field label="Senha atual" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <Field label="Nova senha" type="password" autoComplete="new-password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} hint="Mínimo de 8 caracteres." />
          <Field label="Confirmar nova senha" type="password" autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          <FormError message={pwError} />
          <button className="btn-secondary" disabled={!pw.currentPassword || !pw.newPassword}>Alterar senha</button>
        </form>
      </div>
    </div>
  );
}
