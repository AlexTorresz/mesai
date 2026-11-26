import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Cart } from '../lib/types';
import { useAuth } from './AuthContext';

interface CartState {
  cart: Cart | null;
  count: number;
  reload: (background?: boolean) => Promise<void>;
  setCart: (c: Cart) => void;
}
const CartCtx = createContext<CartState>({ cart: null, count: 0, reload: async () => {}, setCart: () => {} });

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const reload = useCallback(async (background = false) => {
    try {
      const r = await api<{ cart: Cart }>('/cart', { background });
      setCart(r.cart);
    } catch {
      /* tratado globalmente */
    }
  }, []);
  useEffect(() => {
    if (user) void reload(true);
    else setCart(null);
  }, [user, reload]);
  const count = cart?.items.reduce((a, i) => a + i.quantity, 0) ?? 0;
  return <CartCtx.Provider value={{ cart, count, reload, setCart }}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
