import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, X, LogOut, Palette } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { ROLE_LABEL } from '../lib/format';

function Item({ to, num, children, onClick, badge }: { to: string; num?: string; children: ReactNode; onClick?: () => void; badge?: number }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-ctl border-2 px-3 py-2 text-[13px] font-semibold transition ${
          isActive ? 'border-ink bg-primary text-ink shadow-hard-sm' : 'border-transparent text-cream/90 hover:border-cream/30 hover:bg-white/5'
        }`
      }
    >
      {num ? <span className="font-mono text-[11px] font-bold opacity-80">{num}</span> : null}
      <span className="flex-1">{children}</span>
      {badge ? <span className="badge bg-mustard text-ink">{badge}</span> : null}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!user) return null;
  const staff = user.role === 'COLABORADOR' || user.role === 'GERENTE';
  const gerente = user.role === 'GERENTE';
  const close = () => setOpen(false);
  const firstName = user.name.split(' ')[0];

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Menu principal">
      <Item to="/cardapio" num="01" onClick={close}>Cardápio & Descontos</Item>
      <Item to="/cesta" num="02" onClick={close} badge={count}>Cesta & Meus Pedidos</Item>
      {staff ? <Item to="/painel" num="03" onClick={close}>Painel & Entregas</Item> : null}
      {gerente ? <Item to="/usuarios" num="04" onClick={close}>Tipos de Usuários</Item> : null}
      {gerente ? <Item to="/indisponibilidades" num="05" onClick={close}>Indisponibilidades</Item> : null}
      <div className="my-2 border-t-2 border-dashed border-cream/20" />
      <Item to="/perfil" onClick={close}>Perfil • {firstName}</Item>
      {gerente ? <Item to="/configuracoes" onClick={close}>Configurações</Item> : null}
    </nav>
  );

  const footer = (
    <div className="mt-auto flex flex-col gap-2 pt-4">
      <button onClick={toggle} className="flex items-center gap-2 rounded-ctl border-2 border-cream/30 bg-secondary px-3 py-2 text-left font-mono text-[11px] font-bold uppercase text-cream hover:brightness-110">
        <Palette className="h-4 w-4" /> Alternar para {theme === 'carvao' ? 'Creme' : 'Carvão'} ↔
      </button>
      <button
        onClick={async () => {
          await logout();
          navigate('/entrar');
        }}
        className="flex items-center gap-2 rounded-ctl border-2 border-transparent px-3 py-2 text-left font-mono text-[11px] font-bold uppercase text-mustard hover:border-mustard/40"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  );

  const header = (
    <div className="mb-5">
      <Logo light className="text-[34px] leading-none" />
      <p className="mt-1 text-[12px] text-cream/70">
        Sessão: <strong className="text-cream">{user.name}</strong> ({ROLE_LABEL[user.role]})
      </p>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r-2 border-ink bg-sidebar p-4 lg:flex">
        {header}
        {nav}
        {footer}
      </aside>

      {/* Cabeçalho mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-ink bg-sidebar px-4 py-3 lg:hidden">
        <Logo light className="text-[26px] leading-none" />
        <div className="flex items-center gap-2">
          <NavLink to="/cesta" className="badge bg-primary text-ink" aria-label={`Cesta com ${count} itens`}>
            Cesta {count}
          </NavLink>
          <button aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)} className="rounded-ctl border-2 border-cream/40 p-1 text-cream">
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={close}>
          <aside className="flex h-full w-[84vw] max-w-[300px] flex-col overflow-y-auto border-r-2 border-ink bg-sidebar p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              {header}
              <button aria-label="Fechar menu" onClick={close} className="rounded-ctl border-2 border-cream/40 p-1 text-cream">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
