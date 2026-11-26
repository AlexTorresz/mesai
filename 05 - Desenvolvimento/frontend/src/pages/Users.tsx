import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Search } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Role, User } from '../lib/types';
import { ROLE_LABEL } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

const ROLES: Role[] = ['CLIENTE', 'COLABORADOR', 'GERENTE'];

/** RF-10 / RN-07 — Tipos de Usuários (Gerente). */
export default function Users() {
  const { user: me, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[] | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async (query = '') => {
    try {
      const r = await api<{ users: User[] }>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setUsers(r.users);
    } catch (e) {
      toast(errorMessage(e), 'erro');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(u: User, role: Role) {
    if (role === u.role) return;
    const self = u.id === me?.id;
    const msg = self
      ? `Você vai alterar o SEU próprio perfil para ${ROLE_LABEL[role]} e perderá o acesso de Gerente. Confirmar?`
      : `Alterar ${u.name} de ${ROLE_LABEL[u.role]} para ${ROLE_LABEL[role]}?`;
    if (!window.confirm(msg)) return;
    try {
      await api(`/admin/users/${u.id}/role`, { method: 'PATCH', body: { role } });
      toast(`Perfil de ${u.name} alterado para ${ROLE_LABEL[role]}. Vale a partir do próximo acesso.`);
      if (self) {
        await refresh();
        navigate('/cardapio');
        return;
      }
      void load(q);
    } catch (e) {
      toast(errorMessage(e), 'erro');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Tipos de Usuários</h1>
      <p className="text-on-app-muted">Defina quem é Cliente, Colaborador ou Gerente. O Gerente padrão do sistema é protegido e não pode ser alterado.</p>
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input className="input" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-secondary" aria-label="Buscar"><Search className="h-4 w-4" /></button>
      </form>
      {!users ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b-2 border-ink text-left font-mono text-[11px] uppercase">
                <th className="p-3">Nome</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">CPF</th>
                <th className="p-3">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b-2 border-dashed border-ink/20">
                  <td className="p-3 font-semibold">
                    {u.name} {u.id === me?.id ? <span className="badge ml-1 bg-mustard text-ink">você</span> : null}
                  </td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 font-mono">{u.cpf}</td>
                  <td className="p-3">
                    {u.isSeed ? (
                      <span className="badge bg-secondary text-cream"><Lock className="h-3 w-3" /> Gerente padrão</span>
                    ) : (
                      <select aria-label={`Perfil de ${u.name}`} className="input py-1" value={u.role} onChange={(e) => change(u, e.target.value as Role)}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
