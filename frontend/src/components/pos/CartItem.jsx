import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { validateProductStock } from '../../utils/validators';
import toast from 'react-hot-toast';

const CartItem = ({ item, onUpdateQty, onRemove, onUpdateDiscount, isWholesale }) => {
  const pricePerUnit = item.unit_price || item.selling_price;
  const line = pricePerUnit * item.quantity * (1 - item.discount_applied / 100);
  const priceLabel = isWholesale ? 'Wholesale' : 'Retail';
  
  const stockValidation = validateProductStock(item, item.quantity);
  const hasStockIssue = !stockValidation.valid;

  const handleQuantityChange = (newQty) => {
    if (newQty <= 0) {
      onRemove(item.product_id);
      return;
    }
    onUpdateQty(item.product_id, newQty);
  };

  return (
    <div className={`bg-surface-bg border rounded-lg p-3 transition-all
      ${hasStockIssue ? 'border-danger/50 bg-danger/5' : 'border-surface-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 text-text-primary truncate">{item.name}</p>
          <p className="text-xs text-text-muted">
            {formatCurrency(pricePerUnit)} each ({priceLabel})
            {item.discount_applied > 0 && (
              <span className="ml-1 text-success font-500">
                -{item.discount_applied}%
              </span>
            )}
          </p>
          {hasStockIssue && (
            <p className="text-xs text-danger font-500 mt-0.5">
              {stockValidation.message}
            </p>
          )}
        </div>
        <button 
          onClick={() => onRemove(item.product_id)} 
          className="text-text-faint hover:text-danger text-xl leading-none flex-shrink-0 transition-colors"
        >
          ×
        </button>
      </div>
      
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleQuantityChange(item.quantity - 1)} 
            className="w-7 h-7 bg-surface-card border border-surface-border rounded-md text-text-primary hover:border-primary text-sm font-700 transition-all"
          >
            −
          </button>
          <span className={`w-8 text-center text-sm font-600 transition-colors
            ${hasStockIssue ? 'text-danger' : 'text-text-primary'}`}>
            {item.quantity}
          </span>
          <button 
            onClick={() => handleQuantityChange(item.quantity + 1)} 
            className="w-7 h-7 bg-surface-card border border-surface-border rounded-md text-text-primary hover:border-primary text-sm font-700 transition-all"
          >
            +
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Disc%</span>
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={item.discount_applied} 
            onChange={e => onUpdateDiscount(item.product_id, Number(e.target.value))} 
            className="w-12 bg-surface-card border border-surface-border rounded-md px-1.5 py-1 text-xs text-text-primary outline-none focus:border-primary text-center"
          />
        </div>
        
        <p className={`text-sm font-700 ${hasStockIssue ? 'text-danger' : 'text-primary'}`}>
          {formatCurrency(line)}
        </p>
      </div>
    </div>
  );
};

export default CartItem;