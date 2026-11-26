import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Percent, Trash2, Ban, CheckCircle2, Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Category, Dish, Cart } from '../lib/types';
import { brl, pct, previewDiscounted, parseMoneyInput } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Empty, Field, FormError, Modal, QtyStepper, Spinner } from '../components/ui';
import { usePolling } from '../lib/usePolling';

type Tab = 'todos' | 'descontos' | string;

export default function Menu() {
  const { user } = useAuth();
  const toast = useToast();
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<Tab>('todos');
  const [editing, setEditing] = useState<Dish | 'new' | null>(null);
  const [pricing, setPricing] = useState<Dish | null>(null);
  const [deleting, setDeleting] = useState<Dish | null>(null);
  const gerente = user?.role === 'GERENTE';
  const staff = user?.role === 'COLABORADOR' || gerente;

  const load = useCallback(async (background = false) => {
    try {
      const [d, c] = await Promise.all([api<{ dishes: Dish[] }>('/dishes', { background }), api<{ categories: Category[] }>('/categories', { background })]);
      setDishes(d.dishes);
      setCategories(c.categories);
    } catch (e) {
      if (!background) toast(errorMessage(e), 'erro');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);
  usePolling(() => load(true), 15000);

  const discounted = useMemo(() => (dishes ?? []).filter((d) => d.discountPercent), [dishes]);
  const visible = useMemo(() => {
    if (!dishes) return [];
    if (tab === 'todos') return dishes;
    if (tab === 'descontos') return discounted;
    return dishes.filter((d) => d.categoryId === tab);
  }, [dishes, tab, discounted]);

  const grouped = useMemo(() => {
    if (tab !== 'todos') return null;
    return categories.map((c) => ({ category: c, dishes: visible.filter((d) => d.categoryId === c.id) })).filter((g) => g.dishes.length || gerente);
  }, [tab, categories, visible, gerente]);

  const replaceDish = (d: Dish) => setDishes((all) => (all ?? []).map((x) => (x.id === d.id ? d : x)));

  async function toggleAvailability(d: Dish) {
    try {
      const r = await api<{ dish: Dish }>(`/dishes/${d.id}/availability`, { method: 'PATCH', body: { available: !d.available } });
      replaceDish(r.dish);
      toast(r.dish.available ? `"${d.name}" disponível novamente.` : `"${d.name}" marcado como indisponível.`);
    } catch (e) {
      toast(errorMessage(e), 'erro');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">
          Cardápio & Descontos <span className="text-[color:var(--accent-on-app)]">Cantina 67</span>
        </h1>
        <p className="mt-1 text-on-app-muted">Escolha seus pratos, ajuste a quantidade e envie para a cesta. O pagamento é feito na entrega.</p>
      </div>

      {gerente ? <ManagerPanel categories={categories} onChanged={() => load()} onNewDish={() => setEditing('new')} /> : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por categoria">
        <TabBtn active={tab === 'todos'} onClick={() => setTab('todos')}>Todos</TabBtn>
        {categories.map((c) => (
          <TabBtn key={c.id} active={tab === c.id} onClick={() => setTab(c.id)}>{c.name}</TabBtn>
        ))}
        <TabBtn active={tab === 'descontos'} onClick={() => setTab('descontos')}>Descontos ({discounted.length})</TabBtn>
      </div>

      {!dishes ? (
        <Spinner label="Carregando cardápio…" />
      ) : visible.length === 0 && !grouped?.length ? (
        <Empty title="Nenhum prato por aqui">{tab === 'descontos' ? 'Ainda não há pratos com desconto.' : 'Esta categoria ainda não tem pratos.'}</Empty>
      ) : grouped ? (
        grouped.map((g) => (
          <section key={g.category.id} aria-labelledby={`cat-${g.category.id}`} className="flex flex-col gap-3">
            <h2 id={`cat-${g.category.id}`} className="section-title border-b-2 border-dashed border-[color:var(--text-on-app-muted)] pb-1">{g.category.name}</h2>
            {g.dishes.length ? (
              <Grid dishes={g.dishes} staff={!!staff} gerente={gerente} onEdit={setEditing} onPricing={setPricing} onDelete={setDeleting} onToggle={toggleAvailability} />
            ) : (
              <p className="text-[13px] text-on-app-muted">Sem pratos nesta categoria.</p>
            )}
          </section>
        ))
      ) : (
        <Grid dishes={visible} staff={!!staff} gerente={gerente} onEdit={setEditing} onPricing={setPricing} onDelete={setDeleting} onToggle={toggleAvailability} />
      )}

      {editing ? (
        <DishFormModal
          dish={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(d, isNew) => {
            setEditing(null);
            if (isNew) setDishes((all) => [...(all ?? []), d]);
            else replaceDish(d);
            toast(isNew ? 'Prato cadastrado.' : 'Prato atualizado.');
          }}
        />
      ) : null}
      {pricing ? (
        <PricingModal
          dish={pricing}
          onClose={() => setPricing(null)}
          onSaved={(d) => {
            setPricing(null);
            replaceDish(d);
            toast('Preço atualizado.');
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteModal
          dish={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDishes((all) => (all ?? []).filter((x) => x.id !== deleting.id));
            toast(`"${deleting.name}" excluído do cardápio.`);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} className={`tab ${active ? 'bg-primary text-ink' : 'bg-cream text-charcoal hover:bg-white'}`}>
      {children}
    </button>
  );
}

interface GridProps {
  dishes: Dish[];
  staff: boolean;
  gerente: boolean;
  onEdit: (d: Dish) => void;
  onPricing: (d: Dish) => void;
  onDelete: (d: Dish) => void;
  onToggle: (d: Dish) => void;
}

function Grid(p: GridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {p.dishes.map((d) => (
        <DishCard key={d.id} dish={d} {...p} />
      ))}
    </div>
  );
}

function DishCard({ dish, staff, gerente, onEdit, onPricing, onDelete, onToggle }: GridProps & { dish: Dish }) {
  const { setCart } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const r = await api<{ cart: Cart }>('/cart/items', { method: 'POST', body: { dishId: dish.id, quantity: qty } });
      setCart(r.cart);
      toast(`${qty}× ${dish.name} na cesta.`);
      setQty(1);
    } catch (e) {
      toast(errorMessage(e), 'erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`card flex flex-col overflow-hidden ${dish.available ? '' : 'opacity-80'}`}>
      <div className="relative aspect-[400/260] border-b-2 border-ink bg-charcoal">
        <img src={dish.photoUrl} alt={`Foto de ${dish.name}`} loading="lazy" className={`h-full w-full object-cover ${dish.available ? '' : 'grayscale'}`} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {dish.discountPercent ? <span className="badge bg-primary text-ink">-{pct(dish.discountPercent)} OFF</span> : null}
          {dish.categoryName ? <span className="badge bg-secondary text-cream">{dish.categoryName}</span> : null}
        </div>
        {!dish.available ? (
          <span className="badge absolute bottom-2 right-2 bg-mustard text-ink">Indisponível</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-[19px] font-bold leading-tight">{dish.name}</h3>
        <p className="flex-1 text-[13px] text-muted">{dish.description}</p>
        <div className="divider-comanda my-1" />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="leading-tight">
            {dish.discountPercent ? <span className="block font-mono text-[12px] text-muted line-through">{brl(dish.price)}</span> : null}
            <span className="price text-[18px]">{brl(dish.finalPrice)}</span>
          </div>
          {dish.available ? (
            <div className="flex items-center gap-2">
              <QtyStepper value={qty} onChange={setQty} />
              <button className="btn-primary btn-sm" onClick={add} disabled={busy} aria-label={`Adicionar ${qty} ${dish.name} à cesta`}>
                <Plus className="h-3 w-3" /> Cesta
              </button>
            </div>
          ) : (
            <span className="font-mono text-[11px] font-bold uppercase text-muted">Não pode ser adicionado</span>
          )}
        </div>
        {staff ? (
          <div className="mt-2 flex flex-wrap gap-2 border-t-2 border-dashed border-ink/30 pt-3">
            <button className="btn-light btn-sm" onClick={() => onToggle(dish)}>
              {dish.available ? <Ban className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {dish.available ? 'Marcar indisponível' : 'Disponível de novo'}
            </button>
            {gerente ? (
              <>
                <button className="btn-light btn-sm" onClick={() => onPricing(dish)}>
                  <Percent className="h-3 w-3" /> Preço / Desconto
                </button>
                <button className="btn-light btn-sm" onClick={() => onEdit(dish)} aria-label={`Editar ${dish.name}`}>
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button className="btn-danger btn-sm" onClick={() => onDelete(dish)} aria-label={`Excluir ${dish.name}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** Painel gerencial em Papel Comanda: Criar Categoria + Cadastrar Prato (Manual, p. 10). */
function ManagerPanel({ categories, onChanged, onNewDish }: { categories: Category[]; onChanged: () => void; onNewDish: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api('/categories', { method: 'POST', body: { name, sortOrder: categories.length } });
      setName('');
      toast('Categoria criada.');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  async function rename(c: Category) {
    try {
      await api(`/categories/${c.id}`, { method: 'PUT', body: { name: editName, sortOrder: c.sortOrder } });
      setEditingId(null);
      toast('Categoria renomeada.');
      onChanged();
    } catch (err) {
      toast(errorMessage(err), 'erro');
    }
  }
  async function remove(c: Category) {
    if (!window.confirm(`Remover a categoria "${c.name}"?`)) return;
    try {
      await api(`/categories/${c.id}`, { method: 'DELETE' });
      toast('Categoria removida.');
      onChanged();
    } catch (err) {
      toast(errorMessage(err), 'erro');
    }
  }

  return (
    <section className="card grid gap-5 p-4 md:grid-cols-2" aria-label="Gestão do cardápio">
      <div>
        <h2 className="font-display text-[18px] font-bold">Criar Categoria</h2>
        <form onSubmit={create} className="mt-2 flex gap-2">
          <input className="input" aria-label="Nome da categoria" placeholder="Ex.: Especiais da Casa" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-secondary shrink-0" disabled={!name.trim()}>Criar</button>
        </form>
        <FormError message={error} />
        <ul className="mt-3 flex flex-col gap-1">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-ctl border-2 border-dashed border-ink/30 px-2 py-1 text-[13px]">
              {editingId === c.id ? (
                <>
                  <input className="input py-1" aria-label="Novo nome" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <button className="btn-secondary btn-sm" onClick={() => rename(c)}>Salvar</button>
                  <button className="btn-light btn-sm" onClick={() => setEditingId(null)}>×</button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-semibold">{c.name}</span>
                  <button className="p-1" aria-label={`Renomear ${c.name}`} onClick={() => { setEditingId(c.id); setEditName(c.name); }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-danger" aria-label={`Remover ${c.name}`} onClick={() => remove(c)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-between gap-3 border-t-2 border-dashed border-ink/30 pt-4 md:border-l-2 md:border-t-0 md:pl-5 md:pt-0">
        <div>
          <h2 className="font-display text-[18px] font-bold">Cadastrar Prato</h2>
          <p className="mt-1 text-[13px] text-muted">Nome, descrição, valor fixo, categoria e foto são obrigatórios. O desconto é opcional (0,1% a 100%).</p>
        </div>
        <button className="btn-primary" onClick={onNewDish} disabled={!categories.length}>
          <Plus className="h-4 w-4" /> Novo prato
        </button>
        {!categories.length ? <p className="text-[12px] text-muted">Crie uma categoria primeiro.</p> : null}
      </div>
    </section>
  );
}

function DishFormModal({ dish, categories, onClose, onSaved }: { dish: Dish | null; categories: Category[]; onClose: () => void; onSaved: (d: Dish, isNew: boolean) => void }) {
  const [f, setF] = useState({
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    price: dish ? dish.price.replace('.', ',') : '',
    categoryId: dish?.categoryId ?? categories[0]?.id ?? '',
    discountPercent: dish?.discountPercent ? dish.discountPercent.replace('.', ',') : '',
    photoUrl: dish && !dish.photoUrl.startsWith('/uploads/') ? dish.photoUrl : '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dish && !file && !f.photoUrl.trim()) return setError('A foto é obrigatória: envie um arquivo ou informe uma URL.');
    const form = new FormData();
    form.set('name', f.name);
    form.set('description', f.description);
    form.set('price', String(parseMoneyInput(f.price)));
    form.set('categoryId', f.categoryId);
    form.set('discountPercent', f.discountPercent ? String(parseMoneyInput(f.discountPercent)) : '');
    if (f.photoUrl.trim()) form.set('photoUrl', f.photoUrl.trim());
    if (file) form.set('photo', file);
    setBusy(true);
    try {
      const r = await api<{ dish: Dish }>(dish ? `/dishes/${dish.id}` : '/dishes', { method: dish ? 'PUT' : 'POST', form });
      onSaved(r.dish, !dish);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={dish ? `Editar ${dish.name}` : 'Cadastrar prato'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <Field className="sm:col-span-2" label="Nome" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="dish-desc">Descrição <span className="text-danger">*</span></label>
          <textarea id="dish-desc" className="input min-h-[80px]" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <Field label="Valor fixo (R$)" required inputMode="decimal" className="font-mono" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0,00" />
        <div>
          <label className="label" htmlFor="dish-cat">Categoria <span className="text-danger">*</span></label>
          <select id="dish-cat" className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Field label="Desconto % (opcional)" inputMode="decimal" className="font-mono" value={f.discountPercent} onChange={(e) => setF({ ...f, discountPercent: e.target.value })} hint="Entre 0,1 e 100. Vazio = sem desconto." />
        <div>
          <label className="label" htmlFor="dish-file">Foto (arquivo){!dish ? <span className="text-danger"> *</span> : null}</label>
          <input id="dish-file" type="file" accept="image/jpeg,image/png,image/webp" className="input py-1 text-[12px]" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="mt-1 text-[12px] text-muted">JPG, PNG ou WEBP até 5 MB{dish ? '. Deixe vazio para manter a atual.' : ''}</p>
        </div>
        <Field className="sm:col-span-2" label="…ou URL da foto" type="url" value={f.photoUrl} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} placeholder="https://…" />
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-light" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar prato'}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Aba de desconto: slider de porcentagem que calcula o novo preço (RF-17 / RN-12). */
function PricingModal({ dish, onClose, onSaved }: { dish: Dish; onClose: () => void; onSaved: (d: Dish) => void }) {
  const [price, setPrice] = useState(dish.price.replace('.', ','));
  const [hasDiscount, setHasDiscount] = useState(!!dish.discountPercent);
  const [discount, setDiscount] = useState<number>(dish.discountPercent ? Number(dish.discountPercent) : 10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const priceNum = parseMoneyInput(price);
  const preview = Number.isFinite(priceNum) ? previewDiscounted(priceNum, hasDiscount ? discount : null) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ dish: Dish }>(`/dishes/${dish.id}/pricing`, { method: 'PATCH', body: { price: priceNum, discountPercent: hasDiscount ? discount : null } });
      onSaved(r.dish);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Preço / Desconto — ${dish.name}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Valor fixo (R$)" inputMode="decimal" className="font-mono" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div role="tablist" className="flex gap-2">
          <button type="button" role="tab" aria-selected={!hasDiscount} onClick={() => setHasDiscount(false)} className={`tab flex-1 ${!hasDiscount ? 'bg-secondary text-cream' : 'bg-white'}`}>Sem desconto</button>
          <button type="button" role="tab" aria-selected={hasDiscount} onClick={() => setHasDiscount(true)} className={`tab flex-1 ${hasDiscount ? 'bg-primary text-ink' : 'bg-white'}`}>Aplicar desconto %</button>
        </div>
        {hasDiscount ? (
          <div className="rounded-ctl border-2 border-dashed border-ink/50 p-3">
            <label className="label" htmlFor="disc-range">Desconto: <span className="text-primary-text">{pct(discount)}</span></label>
            <input id="disc-range" type="range" min={0.1} max={100} step={0.1} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full accent-[#E86A24]" />
            <div className="mt-2 flex items-center gap-2">
              <input aria-label="Desconto em porcentagem" className="input w-28 font-mono" type="number" min={0.1} max={100} step={0.1} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              <span className="font-mono text-[12px] text-muted">entre 0,1% e 100%</span>
            </div>
          </div>
        ) : null}
        <div className="divider-comanda" />
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[12px] font-bold uppercase">Preço ao cliente</span>
          <span className="font-display text-[24px] font-black">
            {hasDiscount ? <span className="mr-2 font-mono text-[13px] font-normal text-muted line-through">{brl(priceNum)}</span> : null}
            <span className="text-primary-text">{brl(preview)}</span>
          </span>
        </div>
        <p className="text-[12px] text-muted">Pedidos já realizados mantêm o preço da época (preço congelado).</p>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-light" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar preço'}</button>
        </div>
      </form>
    </Modal>
  );
}

/** RF-18 — exclusão confirmada digitando o nome do prato. */
function DeleteModal({ dish, onClose, onDeleted }: { dish: Dish; onClose: () => void; onDeleted: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const match = text.trim() === dish.name.trim();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/dishes/${dish.id}`, { method: 'DELETE', body: { confirmName: text } });
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open title="Excluir prato" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-[14px]">
          O prato sairá do cardápio, mas continuará visível nos pedidos antigos. Para confirmar, digite exatamente: <strong className="font-mono">{dish.name}</strong>
        </p>
        <Field label="Nome do prato" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-light" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" disabled={!match || busy}>{busy ? 'Excluindo…' : 'Excluir prato'}</button>
        </div>
      </form>
    </Modal>
  );
}
