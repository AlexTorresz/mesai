import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Order } from '../lib/types';
import { brl, dateTime, minutesUntil, PAYMENT_LABEL, pct, STATUS_FLOW, STATUS_LABEL, time } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, StatusBadge } from '../components/ui';
import { usePolling } from '../lib/usePolling';

/** RF-28 — acompanhamento com atualização automática (RNF-07). */
export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (background = false) => {
      try {
        const r = await api<{ order: Order }>(`/orders/${id}`, { background });
        setOrder((prev) => {
          if (prev && prev.status !== r.order.status && background) toast(`Pedido ${r.order.code}: ${STATUS_LABEL[r.order.status]}.`);
          return r.order;
        });
      } catch {
        if (!background) setNotFound(true);
      }
    },
    [id, toast],
  );

  useEffect(() => {
    void load();
  }, [load]);
  usePolling(() => load(true), 5000, !!order && order.status !== 'ENTREGUE' && order.status !== 'CANCELADO');

  if (notFound) return <p className="text-on-app">Pedido não encontrado.</p>;
  if (!order) return <Spinner />;

  const mine = !order.customer || user?.role === 'CLIENTE';
  const currentIdx = STATUS_FLOW.indexOf(order.status);

  async function cancel() {
    if (!order || !window.confirm(`Cancelar o pedido ${order.code}?`)) return;
    try {
      const r = await api<{ order: Order }>(`/orders/${order.id}/cancel`, { method: 'POST' });
      setOrder(r.order);
      toast('Pedido cancelado.');
    } catch (e) {
      toast(errorMessage(e), 'erro');
      void load();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/cesta" className="inline-flex items-center gap-1 font-mono text-[12px] font-bold uppercase text-on-app-muted hover:underline">
        <ArrowLeft className="h-4 w-4" /> Cesta & Meus Pedidos
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title">Pedido {order.code}</h1>
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'CANCELADO' ? (
        <div role="status" className="card border-danger bg-[#fbe4e1] p-4">
          <p className="font-display text-[18px] font-bold text-danger">Pedido cancelado</p>
          {order.cancelReason ? (
            <p className="mt-1 text-[14px]">
              <strong>Motivo informado pelo restaurante:</strong> {order.cancelReason}
            </p>
          ) : (
            <p className="mt-1 text-[14px]">Cancelado {order.cancelledByRole === 'CLIENTE' ? 'por você' : 'pelo restaurante'}.</p>
          )}
        </div>
      ) : (
        <section className="card p-4" aria-label="Andamento do pedido">
          <ol className="grid grid-cols-4 gap-2">
            {STATUS_FLOW.map((s, i) => {
              const done = i <= currentIdx;
              const ev = order.events.find((e) => e.status === s);
              return (
                <li key={s} className="flex flex-col items-center gap-1 text-center">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink font-mono text-[13px] font-bold ${done ? (i === currentIdx ? 'bg-primary text-ink' : 'bg-secondary text-cream') : 'bg-white text-muted'}`}>
                    {done && i < currentIdx ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-[12px] font-semibold ${done ? '' : 'text-muted'}`}>{STATUS_LABEL[s]}</span>
                  <span className="font-mono text-[11px] text-muted">{ev ? time(ev.at) : '—'}</span>
                </li>
              );
            })}
          </ol>
          {order.estimatedArrival ? (
            <p className="mt-4 border-t-2 border-dashed border-ink/30 pt-3 font-display text-[18px] font-bold">
              Previsão de chegada: ~{minutesUntil(order.estimatedArrival)} min <span className="font-mono text-[13px] font-normal text-muted">(até {time(order.estimatedArrival)})</span>
            </p>
          ) : null}
          <p className="mt-1 text-[12px] text-muted">Esta tela se atualiza sozinha a cada poucos segundos.</p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-4" aria-label="Itens do pedido">
          <h2 className="font-display text-[20px] font-bold">Comanda</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead>
                <tr className="border-b-2 border-ink text-left font-mono text-[11px] uppercase">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Unit.</th>
                  <th className="py-2 text-right">Desc.</th>
                  <th className="py-2 text-right">Unit. c/ desc.</th>
                  <th className="py-2 text-right">Qtd</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b-2 border-dashed border-ink/25">
                    <td className="py-2 font-sans font-semibold">{i.name}</td>
                    <td className="py-2 text-right">{brl(i.unitPrice)}</td>
                    <td className="py-2 text-right">{Number(i.discountPercent) ? pct(i.discountPercent) : '—'}</td>
                    <td className="py-2 text-right">{brl(i.unitPriceDiscounted)}</td>
                    <td className="py-2 text-right">{i.quantity}</td>
                    <td className="py-2 text-right font-bold">{brl(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 font-mono text-[13px]">
            <dt>Itens</dt>
            <dd className="text-right">{brl(order.itemsTotal)}</dd>
            <dt>Taxa de entrega</dt>
            <dd className="text-right">{brl(order.deliveryFee)}</dd>
          </dl>
          <div className="divider-comanda my-2" />
          <p className="flex justify-between font-display text-[22px] font-black">
            Total <span className="text-primary-text">{brl(order.total)}</span>
          </p>
        </section>

        <section className="card flex flex-col gap-3 p-4 text-[13px]" aria-label="Entrega e pagamento">
          <h2 className="font-display text-[20px] font-bold">Entrega & pagamento</h2>
          <p>
            <span className="label">Pagamento na entrega</span>
            {PAYMENT_LABEL[order.paymentMethod]}
            {order.paymentMethod === 'DINHEIRO' ? (order.needsChange ? ` — paga com ${brl(order.cashAmount)}, troco de ${brl(order.changeAmount)}` : ' — valor exato') : ''}
          </p>
          <p>
            <span className="label">Origem</span>
            {order.storeAddress || 'Cantina 67'}
          </p>
          <p>
            <span className="label">Destino</span>
            CEP {order.delivery.cep}, nº {order.delivery.number}
            {order.delivery.complement ? ` — ${order.delivery.complement}` : ''}
            {order.delivery.reference ? ` (Ref.: ${order.delivery.reference})` : ''}
          </p>
          {order.customer ? (
            <p>
              <span className="label">Cliente</span>
              {order.customer.name} — {order.customer.phone}
            </p>
          ) : null}
          <div>
            <span className="label">Histórico</span>
            <ul className="flex flex-col gap-1 font-mono text-[12px]">
              {order.events.map((e, i) => (
                <li key={i}>
                  {dateTime(e.at)} — {STATUS_LABEL[e.status]}
                  {e.by ? ` (${e.by})` : ''}
                  {e.reason ? `: ${e.reason}` : ''}
                </li>
              ))}
            </ul>
          </div>
          {mine && order.status === 'RECEBIDO' ? (
            <button className="btn-danger mt-auto" onClick={cancel}>
              × Cancelar pedido
            </button>
          ) : null}
          {mine && order.status !== 'RECEBIDO' && order.status !== 'CANCELADO' && order.status !== 'ENTREGUE' ? (
            <p className="mt-auto text-[12px] text-muted">O cancelamento pelo cliente só é possível enquanto o pedido está em “Recebido”.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
