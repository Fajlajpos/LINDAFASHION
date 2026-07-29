'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItemType } from './types';

interface CartContextType {
  cart: CartItemType[];
  addToCart: (item: CartItemType) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, mnozstvi: number) => void;
  clearCart: () => void;
  totalCartValue: number;
  totalItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItemType[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('linda_cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error('Chyba načtení košíku z localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('linda_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItemType) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, mnozstvi: i.mnozstvi + item.mnozstvi } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, mnozstvi: number) => {
    if (mnozstvi <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, mnozstvi } : i)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalCartValue = cart.reduce(
    (sum, item) => sum + (item.cenaPoSleve || item.cena) * item.mnozstvi,
    0
  );

  const totalItemCount = cart.reduce((sum, item) => sum + item.mnozstvi, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCartValue,
        totalItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart musí být použit uvnitř CartProvider');
  }
  return context;
};
