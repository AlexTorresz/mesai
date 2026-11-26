import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import type { Role } from './lib/types';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Menu from './pages/Menu';
import CartPage from './pages/Cart';
import OrderDetail from './pages/OrderDetail';
import Panel from './pages/Panel';
import Users from './pages/Users';
import Unavailability from './pages/Unavailability';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

/** RF-08 — a interface esconde rotas; a autorização real é feita no backend (RNF-02). */
function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8"><Spinner /></div>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-6 text-center">
        <p className="font-display text-[22px] font-black">Acesso negado</p>
        <p className="mt-2 text-[13px] text-muted">Seu perfil não tem permissão para esta tela.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8"><Spinner /></div>;
  if (user) return <Navigate to="/cardapio" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/entrar" element={<PublicOnly><Login /></PublicOnly>} />
                <Route path="/redefinir-senha" element={<ResetPassword />} />
                <Route element={<Guard><Layout /></Guard>}>
                  <Route path="/cardapio" element={<Menu />} />
                  <Route path="/cesta" element={<CartPage />} />
                  <Route path="/pedidos/:id" element={<OrderDetail />} />
                  <Route path="/perfil" element={<Profile />} />
                  <Route path="/painel" element={<Guard roles={['COLABORADOR', 'GERENTE']}><Panel /></Guard>} />
                  <Route path="/usuarios" element={<Guard roles={['GERENTE']}><Users /></Guard>} />
                  <Route path="/indisponibilidades" element={<Guard roles={['GERENTE']}><Unavailability /></Guard>} />
                  <Route path="/configuracoes" element={<Guard roles={['GERENTE']}><Settings /></Guard>} />
                </Route>
                <Route path="*" element={<Navigate to="/cardapio" replace />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
