import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { promotionService } from '../services/promotionService';
import { validateProductStock } from '../utils/validators';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isWholesale, setIsWholesale] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [isCalculatingPromotion, setIsCalculatingPromotion] = useState(false);
  const [cartErrors, setCartErrors] = useState([]);

  const addToCart = useCallback((product, wholesale = false) => {
    const validation = validateProductStock(product, 1);
    if (!validation.valid) {
      toast.error(validation.message);
      return false;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id);
      const priceToUse = wholesale && product.wholesale_price ? product.wholesale_price : product.selling_price;
      
      if (existing) {
        const newQty = existing.quantity + 1;
        const stockValidation = validateProductStock(product, newQty);
        if (!stockValidation.valid) {
          toast.error(stockValidation.message);
          return prev;
        }
        return prev.map(i => 
          i.product_id === product.product_id 
            ? { ...i, quantity: newQty, unit_price: priceToUse } 
            : i
        );
      }
      return [...prev, { 
        ...product, 
        quantity: 1, 
        discount_applied: 0,
        unit_price: priceToUse,
        tax_rate: product.tax_rate || 15,
        tax_exempt: product.tax_exempt || false
      }];
    });
    return true;
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.product_id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    clearPromotion();
    setCartErrors([]);
  }, []);

  const updateQuantity = useCallback((id, qty) => {
    if (qty <= 0) { 
      removeFromCart(id); 
      return; 
    }
    setCart(prev => {
      const item = prev.find(i => i.product_id === id);
      if (!item) return prev;
      const product = {
        ...item,
        stock_quantity: item.stock_quantity || 0
      };
      const validation = validateProductStock(product, qty);
      if (!validation.valid) {
        toast.error(validation.message);
        return prev;
      }
      return prev.map(i => i.product_id === id ? { ...i, quantity: qty } : i);
    });
  }, [removeFromCart]);

  const updateDiscount = useCallback((id, disc) => {
    setCart(prev => prev.map(i => 
      i.product_id === id 
        ? { ...i, discount_applied: Math.min(100, Math.max(0, disc)) } 
        : i
    ));
  }, []);

  const setWholesaleMode = useCallback((value) => {
    setIsWholesale(value);
  }, []);

  const setCartCustomer = useCallback((customer) => {
    setCustomerId(customer?.customer_id || null);
  }, []);

  // Calculate totals
  const originalSubtotal = cart.reduce((sum, item) => {
    const price = item.unit_price || item.selling_price;
    return sum + (price * item.quantity * (1 - (item.discount_applied || 0) / 100));
  }, 0);

  const discountedSubtotal = Math.max(0, originalSubtotal - appliedDiscount);

  const taxAmount = cart.reduce((sum, item) => {
    if (item.tax_exempt) return sum;
    const price = item.unit_price || item.selling_price;
    const itemDiscount = item.discount_applied || 0;
    const discountedPrice = price * (1 - itemDiscount / 100);
    const base = discountedPrice * item.quantity;
    const itemShare = originalSubtotal > 0 ? (base / originalSubtotal) : 0;
    const itemDiscounted = base - (appliedDiscount * itemShare);
    return sum + (itemDiscounted * (item.tax_rate || 15) / 100);
  }, 0);

  const total = discountedSubtotal + taxAmount;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const setPromotion = useCallback((promotion, discount) => {
    setAppliedPromotion(promotion);
    setAppliedDiscount(discount || 0);
  }, []);

  const clearPromotion = useCallback(() => {
    setAppliedPromotion(null);
    setAppliedDiscount(0);
  }, []);

  // CRITICAL: Fetch available promotions
  const fetchAvailablePromotions = useCallback(async () => {
    console.log('[CartContext] ===== FETCHING PROMOTIONS =====');
    console.log('[CartContext] Cart length:', cart.length);
    console.log('[CartContext] Customer ID:', customerId);
    console.log('[CartContext] Is Wholesale:', isWholesale);
    
    if (cart.length === 0) {
      console.log('[CartContext] Cart empty, clearing promotions');
      setAvailablePromotions([]);
      return;
    }

    setIsCalculatingPromotion(true);
    
    try {
      // Call the API
      console.log('[CartContext] Calling promotionService.getActivePromotions()...');
      const response = await promotionService.getActivePromotions(customerId, isWholesale);
      console.log('[CartContext] API Response:', response);
      
      const activePromotions = response.promotions || [];
      console.log('[CartContext] Found', activePromotions.length, 'promotions');
      
      // Log each promotion details
      activePromotions.forEach((promo, index) => {
        console.log(`[CartContext] Promotion ${index + 1}:`, {
          id: promo.promotion_id,
          name: promo.name,
          type: promo.promotion_type,
          value: promo.discount_value,
          min_purchase: promo.min_purchase,
          min_quantity: promo.min_quantity,
          is_active: promo.is_active
        });
      });
      
      setAvailablePromotions(activePromotions);
      
      // If there's only one promotion, auto-apply it (or let user choose)
      if (activePromotions.length === 1) {
        const promo = activePromotions[0];
        const minPurchase = parseFloat(promo.min_purchase) || 0;
        const isEligible = minPurchase === 0 || originalSubtotal >= minPurchase;
        
        console.log('[CartContext] Single promotion found:', promo.name);
        console.log('[CartContext] Min purchase:', minPurchase);
        console.log('[CartContext] Subtotal:', originalSubtotal);
        console.log('[CartContext] Is eligible:', isEligible);
        
        // Optionally auto-apply if eligible (you can remove this if you want manual only)
        if (isEligible && !appliedPromotion) {
          let discount = 0;
          if (promo.promotion_type === 'percentage') {
            discount = originalSubtotal * (parseFloat(promo.discount_value) / 100);
          } else if (promo.promotion_type === 'fixed') {
            discount = parseFloat(promo.discount_value);
          }
          discount = Math.min(discount, originalSubtotal);
          
          if (discount > 0) {
            console.log('[CartContext] Auto-applying promotion:', promo.name, 'Discount:', discount);
            setAppliedPromotion(promo);
            setAppliedDiscount(discount);
          }
        }
      }
    } catch (error) {
      console.error('[CartContext] Error fetching promotions:', error);
      console.error('[CartContext] Error details:', error.response?.data || error.message);
      setAvailablePromotions([]);
    } finally {
      setIsCalculatingPromotion(false);
      console.log('[CartContext] ===== FETCHING PROMOTIONS COMPLETE =====');
    }
  }, [cart, customerId, isWholesale, originalSubtotal, appliedPromotion]);

  // Trigger promotion fetch when cart changes
  useEffect(() => {
    console.log('[CartContext] Cart changed, scheduling promotion fetch...');
    const timer = setTimeout(() => {
      fetchAvailablePromotions();
    }, 500);
    return () => clearTimeout(timer);
  }, [cart, customerId, isWholesale, fetchAvailablePromotions]);

  // Clear promotion when cart becomes empty
  useEffect(() => {
    if (cart.length === 0) {
      clearPromotion();
      setAvailablePromotions([]);
    }
  }, [cart.length]);

  const validateCart = useCallback(() => {
    const errors = [];
    for (const item of cart) {
      const validation = validateProductStock(item, item.quantity);
      if (!validation.valid) {
        errors.push({
          product_id: item.product_id,
          name: item.name,
          message: validation.message
        });
      }
    }
    setCartErrors(errors);
    return errors;
  }, [cart]);

  useEffect(() => {
    validateCart();
  }, [cart, validateCart]);

  const value = {
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
    clearPromotion,
    availablePromotions,
    isCalculatingPromotion,
    setCartCustomer,
    customerId,
    cartErrors,
    validateCart,
    fetchAvailablePromotions
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};