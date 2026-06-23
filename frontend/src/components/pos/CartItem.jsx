import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const CartItem = ({ item, onUpdateQty, onRemove, onUpdateDiscount }) => {
  const line = item.selling_price * item.quantity * (1 - item.discount_applied / 100);
  return (
    <div className="bg-surface-bg border border-surface-border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 text-text-primary truncate">{item.name}</p>
          <p className="text-xs text-text-muted">{formatCurrency(item.selling_price)} each</p>
        </div>
        <button onClick={() => onRemove(item.product_id)} className="text-text-faint hover:text-danger text-xl leading-none flex-shrink-0 transition-colors">×</button>
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => onUpdateQty(item.product_id, item.quantity - 1)} className="w-7 h-7 bg-surface-card border border-surface-border rounded-md text-text-primary hover:border-primary text-sm font-700 transition-all">−</button>
          <span className="w-8 text-center text-sm font-600 text-text-primary">{item.quantity}</span>
          <button onClick={() => onUpdateQty(item.product_id, item.quantity + 1)} className="w-7 h-7 bg-surface-card border border-surface-border rounded-md text-text-primary hover:border-primary text-sm font-700 transition-all">+</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Disc%</span>
          <input type="number" min="0" max="100" value={item.discount_applied} onChange={e => onUpdateDiscount(item.product_id, Number(e.target.value))} className="w-12 bg-surface-card border border-surface-border rounded-md px-1.5 py-1 text-xs text-text-primary outline-none focus:border-primary text-center" />
        </div>
        <p className="text-sm font-700 text-primary">{formatCurrency(line)}</p>
      </div>
    </div>
  );
};

export default CartItem;
