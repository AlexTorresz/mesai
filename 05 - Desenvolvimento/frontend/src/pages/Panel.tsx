import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Order, OrderStatus } from '../lib/types';
import { brl, dateTime, minutesSince, NEXT_ACTION_LABEL, NEXT_STATUS, PAYMENT_LABEL, STATUS_LABEL } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Empty, FormError, Modal, Spinner, StatusBadge } from '../components/ui';
import { usePolling } from '../lib/usePolling';

type Tab = 'producao' | 'finalizados';
const COLUMNS: OrderStatus[] = ['RECEBIDO', 'EM_PREPARACAO', 'EM_TRANSPORTE'];

interface Summary {
  totalOrders: number;
  counts: Partial<Record<OrderStatus, number>>;
  deliveredCount: number;
  revenue: string;
  averageTicket: string;
}

/** RF-30 a RF-32 — Painel & Entregas (Colaborador/Gerente). */
export default function Panel() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('producao');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [counts, setCounts] = useState({ producao: 0, finalizados: 0 });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const gerente = user?.role === 'GERENTE';

  const load = useCallback(
    async (background = false) => {
      try {
        const [prod, fin] = await Promise.all([
          api<{ orders: Order[] }>('/admin/orders?tab=producao', { background }),
          api<{ orders: Order[] }>('/admin/orders?tab=finalizados', { background }),
        ]);
        setCounts({ producao: prod.orders.length, finalizados: fin.orders.length });
        setOrders(tab === 'producao' ? prod.orders : fin.orders);
        if (gerente) setSummary(await api<Summary>('/admin/orders/summary/today', { background }));
      } catch (e) {
        if (!background) toast(errorMessage(e), 'erro');
      }
    },
    [tab, gerente, toast],
  );

  useEffect(() => {
    setOrders(null);
    void load();
  }, [load]);
  usePolling(() => load(true), 5000);

  async function advance(o: Order) {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    setBusyId(o.id);
    try {
      await api(`/admin/orders/${o.id}/status`, { method: 'POST', body: { status: next } });
      toast(`${o.code}: ${STATUS_LABEL[next]}.`);
      await load();
    } catch (e) {
      toast(errorMessage(e), 'erro');
      void load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="page-title">Painel & Entregas</h1>

      {gerente && summary ? (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Resumo de hoje">
          <Stat label="Pedidos hoje" value={String(summary.totalOrders)} />
          <Stat label="Em andamento" value={String((summary.counts.RECEBIDO ?? 0) + (summary.counts.EM_PREPARACAO ?? 0) + (summary.counts.EM_TRANSPORTE ?? 0))} />
          <Stat label="Entregues" value={String(summary.deliveredCount)} />
          <Stat label="Recebido (entregues)" value={brl(summary.revenue)} highlight />
          <Stat label="Ticket médio" value={brl(summary.averageTicket)} />
        </section>
      ) : null}

      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'producao'} onClick={() => setTab('producao')} className={`tab ${tab === 'producao' ? 'bg-primary text-ink' : 'bg-cream text-charcoal'}`}>
          Em Produção ({counts.producao})
        </button>
        <button role="tab" aria-selected={tab === 'finalizados'} onClick={() => setTab('finalizados')} className={`tab ${tab === 'finalizados' ? 'bg-primary text-ink' : 'bg-cream text-charcoal'}`}>
          Finalizados ({counts.finalizados})
        </button>
      </div>

      {!orders ? (
        <Spinner />
      ) : tab === 'producao' ? (
        orders.length === 0 ? (
          <Empty title="Nenhum pedido em produção">Novos pedidos aparecem aqui automaticamente.</Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {COLUMNS.map((s) => {
              const list = orders.filter((o) => o.status === s);
              return (
                <section key={s} aria-label={STATUS_LABEL[s]} className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-wider text-on-app">
                    <StatusBadge status={s} /> {list.length} pedido(s)
                  </h2>
                  {list.map((o) => (
                    <OrderCard key={o.id} order={o} busy={busyId === o.id} onAdvance={() => advance(o)} onCancel={() => setCancelling(o)} />
                  ))}
                </section>
              );
            })}
          </div>
        )
      ) : orders.length === 0 ? (
        <Empty title="Nenhum pedido finalizado" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orders.map((o) => (
            <Link key={o.id} to={`/pedidos/${o.id}`} className="card flex flex-col gap-1 p-3 hover:-translate-y-[1px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[14px] font-bold">{o.code}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-[13px]">
                {o.customer?.name} • {brl(o.total)} • {PAYMENT_LABEL[o.paymentMethod]}
              </p>
              <p className="font-mono text-[11px] text-muted">Atualizado em {dateTime(o.updatedAt)}</p>
              {o.cancelReason ? (
                <p className="text-[13px] text-danger">
                  <strong>Motivo:</strong> {o.cancelReason}
                </p>
              ) : o.status === 'CANCELADO' ? (
                <p className="text-[13px] text-muted">Cancelado pelo cliente.</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      {cancelling ? (
        <CancelModal
          order={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            toast(`${cancelling.code} cancelado.`);
            setCancelling(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card p-3 ${highlight ? 'bg-primary' : ''}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="font-display text-[22px] font-black leading-tight">{value}</p>
    </div>
  );
}

function OrderCard({ order: o, busy, onAdvance, onCancel }: { order: Order; busy: boolean; onAdvance: () => void; onCancel: () => void }) {
  const charge =
    o.paymentMethod === 'DINHEIRO'
      ? o.needsChange
        ? `Dinheiro — cliente paga ${brl(o.cashAmount)} (levar troco de ${brl(o.changeAmount)})`
        : 'Dinheiro — valor exato'
      : `${PAYMENT_LABEL[o.paymentMethod]} — levar maquineta`;
  return (
    <article className="card flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <Link to={`/pedidos/${o.id}`} className="font-mono text-[15px] font-bold hover:underline">{o.code}</Link>
        <span className="font-mono text-[11px] text-muted">há {minutesSince(o.createdAt)} min</span>
      </div>
      <ul className="text-[13px]">
        {o.items.map((i) => (
          <li key={i.id}>
            <strong className="font-mono">{i.quantity}×</strong> {i.name}
          </li>
        ))}
      </ul>
      <div className="divider-comanda" />
      <p className="flex items-start gap-1 text-[12px]">
        <MapPin className="mt-[2px] h-3 w-3 shrink-0" /> CEP {o.delivery.cep}, nº {o.delivery.number}
        {o.delivery.complement ? ` — ${o.delivery.complement}` : ''}
        {o.delivery.reference ? ` (Ref.: ${o.delivery.reference})` : ''}
      </p>
      {o.customer ? (
        <p className="flex items-center gap-1 text-[12px]">
          <Phone className="h-3 w-3" /> {o.customer.name} — <span className="font-mono">{o.customer.phone}</span>
        </p>
      ) : null}
      <p className="flex items-start gap-1 text-[12px]">
        <Wallet className="mt-[2px] h-3 w-3 shrink-0" />
        <span>
          Cobrar presencialmente: <strong className="price">{brl(o.total)}</strong> — {charge}
        </span>
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {NEXT_STATUS[o.status] ? (
          <button className="btn-primary btn-sm flex-1" onClick={onAdvance} disabled={busy}>
            {busy ? '…' : NEXT_ACTION_LABEL[o.status]}
          </button>
        ) : null}
        <button className="btn-light btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </article>
  );
}

function CancelModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 3) return setError('O motivo do cancelamento é obrigatório.');
    setBusy(true);
    try {
      await api(`/admin/orders/${order.id}/cancel`, { method: 'POST', body: { reason } });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open title={`Cancelar ${order.code}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-[13px]">O motivo ficará visível para o Cliente e para o Gerente.</p>
        <label className="label" htmlFor="reason">Motivo do cancelamento <span className="text-danger">*</span></label>
        <textarea id="reason" className="input min-h-[90px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Falta de ingrediente para o prato" />
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-light" onClick={onClose}>Voltar</button>
          <button className="btn-danger" disabled={busy}>{busy ? 'Cancelando…' : 'Confirmar cancelamento'}</button>
        </div>
      </form>
    </Modal>
  );
}
