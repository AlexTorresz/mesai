import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, MapPin, Clock } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Cart as CartT, Order, PaymentMethod } from '../lib/types';
import { brl, PAYMENT_LABEL, minutesUntil, time, parseMoneyInput, dateTime } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Empty, FormError, QtyStepper, Spinner, StatusBadge } from '../components/ui';
import { usePolling } from '../lib/usePolling';

const METHODS: PaymentMethod[] = ['PIX', 'CREDITO', 'DEBITO', 'VALE_REFEICAO', 'DINHEIRO'];

export default function CartPage() {
  const { cart, setCart, reload } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [needsChange, setNeedsChange] = useState(false);
  const [cash, setCash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOrders = useCallback(async (background = false) => {
    try {
      const r = await api<{ orders: Order[] }>('/orders/mine', { background });
      setOrders(r.orders);
    } catch {
      /* tratado globalmente */
    }
  }, []);

  useEffect(() => {
    void reload();
    void loadOrders();
  }, [reload, loadOrders]);

  // RNF-07 (status em até 10 s) e RN-09 (prato que ficar indisponível é sinalizado)
  usePolling(() => {
    void loadOrders(true);
    void reload(true);
  }, 5000);

  async function update(dishId: string, quantity: number) {
    try {
      const r = await api<{ cart: CartT }>(`/cart/items/${dishId}`, { method: 'PATCH', body: { quantity } });
      setCart(r.cart);
    } catch (e) {
      toast(errorMessage(e), 'erro');
    }
  }
  async function remove(dishId: string) {
    try {
      const r = await api<{ cart: CartT }>(`/cart/items/${dishId}`, { method: 'DELETE' });
      setCart(r.cart);
    } catch (e) {
      toast(errorMessage(e), 'erro');
    }
  }

  const total = cart ? Number(cart.total) : 0;
  const cashNum = parseMoneyInput(cash);
  const cashInvalid = method === 'DINHEIRO' && needsChange && (!cash || !Number.isFinite(cashNum) || cashNum < total);

  async function checkout() {
    setError(null);
    if (!method) return setError('Escolha a forma de pagamento.');
    if (cashInvalid) return setError(`O valor em dinheiro deve ser maior ou igual ao total (${brl(total)}).`);
    setBusy(true);
    try {
      const r = await api<{ order: Order }>('/orders', {
        method: 'POST',
        body: { paymentMethod: method, needsChange: method === 'DINHEIRO' ? needsChange : false, cashAmount: method === 'DINHEIRO' && needsChange ? cashNum : null },
      });
      toast(`Pedido ${r.order.code} enviado! Status: Recebido.`);
      await reload();
      navigate(`/pedidos/${r.order.id}`);
    } catch (e) {
      setError(errorMessage(e));
      void reload();
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder(o: Order) {
    if (!window.confirm(`Cancelar o pedido ${o.code}?`)) return;
    try {
      await api(`/orders/${o.id}/cancel`, { method: 'POST' });
      toast(`Pedido ${o.code} cancelado.`);
      void loadOrders();
    } catch (e) {
      toast(errorMessage(e), 'erro');
      void loadOrders();
    }
  }

  const active = (orders ?? []).filter((o) => o.status !== 'ENTREGUE' && o.status !== 'CANCELADO');
  const history = (orders ?? []).filter((o) => o.status === 'ENTREGUE' || o.status === 'CANCELADO');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Cesta & Meus Pedidos</h1>

      {active.length ? (
        <section className="flex flex-col gap-3" aria-label="Pedidos em andamento">
          {active.map((o) => (
            <article key={o.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary text-ink">Pedido ativo {o.code}</span>
                  <StatusBadge status={o.status} />
                </div>
                {o.estimatedArrival ? (
                  <p className="flex items-center gap-1 font-display text-[17px] font-bold">
                    <Clock className="h-4 w-4" /> Previsão de entrega: ~{minutesUntil(o.estimatedArrival)} min <span className="font-mono text-[12px] font-normal text-muted">(até {time(o.estimatedArrival)})</span>
                  </p>
                ) : null}
                <p className="text-[12px] text-muted">Origem: {o.storeAddress || 'Cantina 67'}</p>
                <p className="flex items-center gap-1 text-[12px] text-muted">
                  <MapPin className="h-3 w-3" /> Destino: CEP {o.delivery.cep}, nº {o.delivery.number}
                  {o.delivery.complement ? ` — ${o.delivery.complement}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/pedidos/${o.id}`} className="btn-light btn-sm">Acompanhar</Link>
                {o.status === 'RECEBIDO' ? (
                  <button className="btn-danger btn-sm" onClick={() => cancelOrder(o)}>× Cancelar pedido</button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="card p-4 sm:p-5" aria-labelledby="cesta-title">
        <h2 id="cesta-title" className="font-display text-[22px] font-black">
          Itens na Cesta {cart ? `(${cart.items.reduce((a, i) => a + i.quantity, 0)} itens)` : ''}
        </h2>
        {!cart ? (
          <Spinner />
        ) : cart.items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-muted">Sua cesta está vazia.</p>
            <Link to="/cardapio" className="btn-primary mt-3">Ver cardápio</Link>
          </div>
        ) : (
          <>
            {cart.unavailable.length ? (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-ctl border-2 border-ink bg-mustard p-3 text-[13px] text-ink">
                <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0" />
                <span>
                  <strong>{cart.unavailable.map((u) => u.name).join(', ')}</strong> ficou indisponível. Remova da cesta para finalizar o pedido.
                </span>
              </div>
            ) : null}
            <ul className="mt-3 flex flex-col">
              {cart.items.map((i) => (
                <li key={i.dishId} className={`flex flex-wrap items-center gap-3 border-b-2 border-dashed border-ink/30 py-3 ${i.unavailable ? 'bg-mustard/20' : ''}`}>
                  <img src={i.dish.photoUrl} alt="" className="h-14 w-20 rounded-ctl border-2 border-ink object-cover" />
                  <div className="min-w-[140px] flex-1">
                    <p className="font-semibold">{i.dish.name}</p>
                    <p className="font-mono text-[12px] text-muted">
                      {i.dish.discountPercent ? <span className="line-through">{brl(i.dish.price)}</span> : null} {brl(i.unitPriceDiscounted)} un.
                      {i.dish.discountPercent ? <span className="ml-1 text-primary-text">-{Number(i.dish.discountPercent).toLocaleString('pt-BR')}%</span> : null}
                    </p>
                    {i.unavailable ? <span className="badge mt-1 bg-mustard text-ink">Indisponível</span> : null}
                  </div>
                  <QtyStepper value={i.quantity} onChange={(q) => update(i.dishId, q)} disabled={i.unavailable} />
                  <span className="w-24 text-right font-mono font-bold">{brl(i.subtotal)}</span>
                  <button className="rounded-ctl border-2 border-ink p-2 text-danger hover:bg-white" aria-label={`Remover ${i.dish.name}`} onClick={() => remove(i.dishId)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 font-mono text-[13px]">
              <dt>Subtotal dos itens</dt>
              <dd className="text-right">{brl(cart.itemsTotal)}</dd>
              <dt>Taxa de entrega</dt>
              <dd className="text-right">{brl(cart.deliveryFee)}</dd>
            </dl>
            <div className="divider-comanda my-3" />

            <fieldset>
              <legend className="label">Pagamento presencial (na entrega)</legend>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={`tab ${method === m ? 'bg-primary text-ink' : 'bg-white text-charcoal'}`}>
                    {PAYMENT_LABEL[m]}
                  </button>
                ))}
              </div>
              {method === 'DINHEIRO' ? (
                <div className="mt-3 flex flex-col gap-2 rounded-ctl border-2 border-dashed border-ink/50 p-3">
                  <span className="label">Precisa de troco?</span>
                  <div className="flex gap-2">
                    <button type="button" aria-pressed={!needsChange} onClick={() => setNeedsChange(false)} className={`tab ${!needsChange ? 'bg-secondary text-cream' : 'bg-white'}`}>Não, valor exato</button>
                    <button type="button" aria-pressed={needsChange} onClick={() => setNeedsChange(true)} className={`tab ${needsChange ? 'bg-secondary text-cream' : 'bg-white'}`}>Sim</button>
                  </div>
                  {needsChange ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="label" htmlFor="cash">Vou pagar com (R$)</label>
                        <input id="cash" className="input w-40 font-mono" inputMode="decimal" placeholder="100,00" value={cash} onChange={(e) => setCash(e.target.value)} aria-invalid={!!cash && cashInvalid} />
                      </div>
                      <p className={`font-mono text-[13px] ${cash && cashInvalid ? 'text-danger' : ''}`}>
                        {!cash ? `Mínimo: ${brl(total)}` : cashInvalid ? `Valor menor que o total (${brl(total)})` : `Troco: ${brl(cashNum - total)}`}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </fieldset>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-display text-[26px] font-black">
                Total: <span className="text-primary-text">{brl(cart.total)}</span>
              </p>
              <button className="btn-primary" onClick={checkout} disabled={busy || !cart.canCheckout || !method}>
                {busy ? 'Enviando…' : 'Finalizar pedido'}
              </button>
            </div>
            <div className="mt-2">
              <FormError message={error} />
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="hist-title" className="flex flex-col gap-3">
        <h2 id="hist-title" className="section-title">Histórico de pedidos</h2>
        {!orders ? (
          <Spinner />
        ) : history.length === 0 ? (
          <Empty title="Nenhum pedido finalizado ainda" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {history.map((o) => (
              <li key={o.id}>
                <Link to={`/pedidos/${o.id}`} className="card flex items-center justify-between gap-3 p-3 hover:-translate-y-[1px]">
                  <div>
                    <p className="font-mono text-[13px] font-bold">{o.code}</p>
                    <p className="text-[12px] text-muted">{dateTime(o.createdAt)} • {o.items.reduce((a, i) => a + i.quantity, 0)} itens</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={o.status} />
                    <span className="font-mono text-[13px] font-bold">{brl(o.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
