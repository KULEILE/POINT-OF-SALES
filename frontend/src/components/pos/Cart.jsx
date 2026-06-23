import React from 'react';
import CartItem from './CartItem';
import { formatCurrency } from '../../utils/formatters';

const Cart = ({ cart, subtotal, taxAmount, total, itemCount, onUpdateQty, onRemove, onUpdateDiscount, onClear, onCheckout }) => (
  <div className="flex flex-col h-full bg-surface-panel border-l border-surface-border">
    <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
      <div>
        <h2 className="text-sm font-700 text-text-primary">Current Sale</h2>
        <p className="text-xs text-text-muted">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
      </div>
      {cart.length > 0 && (
        <button onClick={onClear} className="text-xs text-text-faint hover:text-danger border border-surface-border hover:border-danger/50 px-2 py-1 rounded-md transition-all">Clear</button>
      )}
    </div>

    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-faint">
          <p className="text-3xl mb-2">—</p>
          <p className="text-sm font-500">Cart is empty</p>
          <p className="text-xs mt-1">Add products to start a sale</p>
        </div>
      ) : cart.map(item => (
        <CartItem key={item.product_id} item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} onUpdateDiscount={onUpdateDiscount} />
      ))}
    </div>

    {cart.length > 0 && (
      <div className="border-t border-surface-border p-4">
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm text-text-muted"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm text-text-muted"><span>VAT (15%)</span><span>{formatCurrency(taxAmount)}</span></div>
          <div className="flex justify-between text-base font-700 text-text-primary border-t border-surface-border pt-2 mt-2">
            <span>TOTAL</span><span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
        <button onClick={onCheckout} className="k-btn-primary w-full py-3.5 text-sm">Process Payment</button>
      </div>
    )}
  </div>
);

export default Cart;
