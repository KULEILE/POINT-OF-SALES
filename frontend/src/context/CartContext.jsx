import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id);
      if (existing) return prev.map(i => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1, discount_applied: 0 }];
    });
  }, []);

  const removeFromCart  = useCallback((id) => setCart(prev => prev.filter(i => i.product_id !== id)), []);
  const clearCart       = useCallback(() => setCart([]), []);

  const updateQuantity  = useCallback((id, qty) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: qty } : i));
  }, [removeFromCart]);

  const updateDiscount  = useCallback((id, disc) => {
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, discount_applied: Math.min(100, Math.max(0, disc)) } : i));
  }, []);

  const subtotal  = cart.reduce((s, i) => s + i.selling_price * i.quantity * (1 - i.discount_applied / 100), 0);
  const taxAmount = cart.reduce((s, i) => {
    if (i.tax_exempt) return s;
    const base = i.selling_price * i.quantity * (1 - i.discount_applied / 100);
    return s + base * (i.tax_rate || 15) / 100;
  }, 0);
  const total     = subtotal + taxAmount;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, updateDiscount, clearCart, subtotal, taxAmount, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
