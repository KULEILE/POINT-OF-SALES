import React from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { validateProductStock } from '../../utils/validators';

const ProductCard = ({ product, onAdd, isWholesale }) => {
  const outOfStock = product.stock_quantity <= 0;
  const lowStock = product.stock_quantity <= (product.min_stock || 5) && !outOfStock;
  
  const isExpired = product.expiry_date && new Date(product.expiry_date) <= new Date();

  // Determine which price to show
  const displayPrice = isWholesale && product.wholesale_price 
    ? product.wholesale_price 
    : product.selling_price;

  const handleAdd = () => {
    if (isExpired) {
      toast.error(`"${product.name}" has expired on ${new Date(product.expiry_date).toLocaleDateString()}. Cannot sell this product.`);
      return;
    }

    if (outOfStock) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }

    const stockValidation = validateProductStock(product, 1);
    
    if (!stockValidation.valid) {
      toast.error(stockValidation.message);
      return;
    }

    onAdd(product);
  };

  let cardStyle = 'border-surface-border hover:border-primary cursor-pointer active:scale-95';
  let statusText = `Qty: ${product.stock_quantity}`;
  let statusColor = 'text-text-faint';

  if (isExpired) {
    cardStyle = 'border-danger opacity-60 cursor-not-allowed';
    statusText = 'Expired';
    statusColor = 'text-danger';
  } else if (outOfStock) {
    cardStyle = 'border-surface-border opacity-50 cursor-not-allowed';
    statusText = 'Out of stock';
    statusColor = 'text-danger';
  } else if (lowStock) {
    statusText = `Low: ${product.stock_quantity}`;
    statusColor = 'text-warning';
  }

  return (
    <button
      onClick={handleAdd}
      disabled={outOfStock || isExpired}
      className={`bg-surface-card border rounded-xl p-3 text-left transition-all w-full ${cardStyle}`}
    >
      {product.category_name && (
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{product.category_name}</span>
      )}
      {isWholesale && product.wholesale_price && (
        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full ml-1">Wholesale</span>
      )}
      <p className="text-sm font-600 text-text-primary mt-2 leading-tight line-clamp-2">{product.name}</p>
      {product.local_name && <p className="text-xs text-text-muted mt-0.5">{product.local_name}</p>}
      <div className="flex items-center gap-2 mt-2">
        <p className="text-primary font-700 text-base">{formatCurrency(displayPrice)}</p>
        {isWholesale && product.wholesale_price && product.wholesale_price < product.selling_price && (
          <p className="text-xs text-text-muted line-through">{formatCurrency(product.selling_price)}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-xs font-500 ${statusColor}`}>
          {statusText}
        </span>
        {!outOfStock && !isExpired && <span className="text-primary text-lg font-300">+</span>}
      </div>
      {isExpired && (
        <div className="mt-1 text-[10px] text-danger font-500">
          Expired: {new Date(product.expiry_date).toLocaleDateString()}
        </div>
      )}
    </button>
  );
};

export default ProductCard;