import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { Dish } from '../lib/types';
import { dateTime, ROLE_LABEL } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Empty, Spinner } from '../components/ui';
import { usePolling } from '../lib/usePolling';
import type { Role } from '../lib/types';

interface Log {
  id: string;
  dishName: string;
  dishDeleted: boolean;
  userName: string;
  userRole: Role;
  available: boolean;
  at: string;
}

/** RF-20 — painel de indisponibilidades (Gerente). */
export default function Unavailability() {
  const toast = useToast();
  const [data, setData] = useState<{ current: Dish[]; logs: Log[] } | null>(null);
  const load = useCallback(async (background = false) => {
    try {
      setData(await api('/unavailability', { background }));
    } catch (e) {
      if (!background) toast(errorMessage(e), 'erro');
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);
  usePolling(() => load(true), 15000);

  if (!data) return <Spinner />;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Indisponibilidades</h1>
      <section className="flex flex-col gap-2">
        <h2 className="section-title">Indisponíveis agora ({data.current.length})</h2>
        {data.current.length === 0 ? (
          <Empty title="Todos os pratos estão disponíveis" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.current.map((d) => (
              <span key={d.id} className="badge bg-mustard text-ink">{d.name}</span>
            ))}
          </div>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="section-title">Registro de marcações</h2>
        {data.logs.length === 0 ? (
          <Empty title="Nenhuma marcação registrada" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-ink text-left font-mono text-[11px] uppercase">
                  <th className="p-3">Data/hora</th>
                  <th className="p-3">Prato</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((l) => (
                  <tr key={l.id} className="border-b-2 border-dashed border-ink/20">
                    <td className="p-3 font-mono">{dateTime(l.at)}</td>
                    <td className="p-3 font-semibold">{l.dishName}{l.dishDeleted ? <span className="ml-1 text-[11px] text-muted">(excluído)</span> : null}</td>
                    <td className="p-3">
                      <span className={`badge ${l.available ? 'bg-success text-cream' : 'bg-mustard text-ink'}`}>{l.available ? 'Disponível' : 'Indisponível'}</span>
                    </td>
                    <td className="p-3">{l.userName} <span className="text-muted">({ROLE_LABEL[l.userRole]})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
