import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../lib/api';
import type { StoreConfig } from '../lib/types';
import { brl, parseMoneyInput } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Field, FormError, Spinner } from '../components/ui';

/** RF-12 / RF-13 — configurações do estabelecimento (Gerente). */
export default function Settings() {
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const [f, setF] = useState<{ address: string; deliveryFee: string; estimatedMinutes: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ config: StoreConfig }>('/config')
      .then((r) => setF({ address: r.config.address, deliveryFee: r.config.deliveryFee.replace('.', ','), estimatedMinutes: String(r.config.estimatedMinutes) }))
      .catch((e) => toast(errorMessage(e), 'erro'));
  }, [toast]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ config: StoreConfig }>('/config', {
        method: 'PUT',
        body: { address: f.address, deliveryFee: parseMoneyInput(f.deliveryFee), estimatedMinutes: Number(f.estimatedMinutes) },
      });
      setF({ address: r.config.address, deliveryFee: r.config.deliveryFee.replace('.', ','), estimatedMinutes: String(r.config.estimatedMinutes) });
      toast(`Configurações salvas. Taxa de entrega: ${brl(r.config.deliveryFee)}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!f) return <Spinner />;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Configurações</h1>
      <form onSubmit={save} className="card flex max-w-2xl flex-col gap-4 p-5" noValidate>
        <h2 className="font-display text-[20px] font-bold">Estabelecimento — Cantina 67</h2>
        <Field label="Endereço do estabelecimento" required value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} hint="Usado como origem da entrega e do tempo estimado." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Taxa de entrega (R$)" required inputMode="decimal" className="font-mono" value={f.deliveryFee} onChange={(e) => setF({ ...f, deliveryFee: e.target.value })} hint="Entra no total de todos os pedidos novos." />
          <Field label="Tempo estimado de entrega (min)" required type="number" min={5} max={240} className="font-mono" value={f.estimatedMinutes} onChange={(e) => setF({ ...f, estimatedMinutes: e.target.value })} hint="Previsão fixa mostrada ao cliente." />
        </div>
        <FormError message={error} />
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar configurações'}</button>
        </div>
      </form>
      <section className="card flex max-w-2xl items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-display text-[20px] font-bold">Paleta da interface</h2>
          <p className="text-[13px] text-muted">Atual: {theme === 'carvao' ? 'Carvão Padrão (escuro)' : 'Creme Retrô (claro)'} — preferência salva neste navegador.</p>
        </div>
        <button className="btn-secondary" onClick={toggle}>Alternar</button>
      </section>
    </div>
  );
}
