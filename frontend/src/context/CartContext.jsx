import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isWholesale, setIsWholesale] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const addToCart = useCallback((product, wholesale = false) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id);
      const priceToUse = wholesale && product.wholesale_price ? product.wholesale_price : product.selling_price;
      
      if (existing) {
        return prev.map(i => 
          i.product_id === product.product_id 
            ? { ...i, quantity: i.quantity + 1, unit_price: priceToUse } 
            : i
        );
      }
      return [...prev, { 
        ...product, 
        quantity: 1, 
        discount_applied: 0,
        unit_price: priceToUse
      }];
    });
  }, []);

  const removeFromCart = useCallback((id) => setCart(prev => prev.filter(i => i.product_id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const updateQuantity = useCallback((id, qty) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: qty } : i));
  }, [removeFromCart]);

  const updateDiscount = useCallback((id, disc) => {
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, discount_applied: Math.min(100, Math.max(0, disc)) } : i));
  }, []);

  const setWholesaleMode = useCallback((value) => {
    setIsWholesale(value);
  }, []);

  // Calculate original subtotal (before any discounts)
  const originalSubtotal = cart.reduce((s, i) => {
    const price = i.unit_price || i.selling_price;
    return s + price * i.quantity * (1 - (i.discount_applied || 0) / 100);
  }, 0);

  // Apply promotion discount BEFORE tax
  const discountedSubtotal = Math.max(0, originalSubtotal - appliedDiscount);

  // Calculate tax on discounted amount
  const taxAmount = cart.reduce((s, i) => {
    if (i.tax_exempt) return s;
    const price = i.unit_price || i.selling_price;
    const itemDiscount = i.discount_applied || 0;
    const discountedPrice = price * (1 - itemDiscount / 100);
    const base = discountedPrice * i.quantity;
    // Apply promotion proportionally to each item
    const itemShare = originalSubtotal > 0 ? (base / originalSubtotal) : 0;
    const itemDiscounted = base - (appliedDiscount * itemShare);
    return s + itemDiscounted * (i.tax_rate || 15) / 100;
  }, 0);

  // Final total = discounted subtotal + tax on discounted amount
  const total = discountedSubtotal + taxAmount;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const setPromotion = useCallback((promotion, discount) => {
    setAppliedPromotion(promotion);
    setAppliedDiscount(discount || 0);
  }, []);

  const clearPromotion = useCallback(() => {
    setAppliedPromotion(null);
    setAppliedDiscount(0);
  }, []);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      updateDiscount, 
      clearCart, 
      originalSubtotal,
      subtotal: discountedSubtotal,
      taxAmount, 
      total,
      itemCount,
      isWholesale,
      setWholesaleMode,
      appliedPromotion,
      appliedDiscount,
      setPromotion,
      clearPromotion
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};