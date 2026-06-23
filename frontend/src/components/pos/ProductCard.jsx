import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const ProductCard = ({ product, onAdd }) => {
  const outOfStock = product.stock_quantity <= 0;
  const lowStock   = product.stock_quantity <= product.reorder_level && !outOfStock;

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={`bg-surface-card border rounded-xl p-3 text-left transition-all w-full
        ${outOfStock ? 'opacity-50 cursor-not-allowed border-surface-border' : 'border-surface-border hover:border-primary cursor-pointer active:scale-95'}`}
    >
      {product.category_name && (
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{product.category_name}</span>
      )}
      <p className="text-sm font-600 text-text-primary mt-2 leading-tight line-clamp-2">{product.name}</p>
      {product.local_name && <p className="text-xs text-text-muted mt-0.5">{product.local_name}</p>}
      <p className="text-primary font-700 text-base mt-2">{formatCurrency(product.selling_price)}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-xs font-500 ${outOfStock ? 'text-danger' : lowStock ? 'text-warning' : 'text-text-faint'}`}>
          {outOfStock ? 'Out of stock' : lowStock ? `Low: ${product.stock_quantity}` : `Qty: ${product.stock_quantity}`}
        </span>
        {!outOfStock && <span className="text-primary text-lg font-300">+</span>}
      </div>
    </button>
  );
};

export default ProductCard;
