import React from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { validateProductStock } from '../../utils/validators';

const ProductCard = ({ product, onAdd, isWholesale, canProcessSales = true, showSku = false }) => {
  const outOfStock = product.stock_quantity <= 0;
  const lowStock = product.stock_quantity <= (product.min_stock || 5) && !outOfStock;
  
  const isExpired = product.expiry_date && new Date(product.expiry_date) <= new Date();

  // Determine which price to show
  const displayPrice = isWholesale && product.wholesale_price && product.wholesale_price > 0
    ? product.wholesale_price 
    : product.selling_price;

  // Get variant display name (size)
  const variantDisplay = product.size || product.variant_name || product.local_name || '';

  // Get description (truncated if too long)
  const description = product.description || '';
  const truncatedDescription = description.length > 60 ? description.substring(0, 60) + '...' : description;

  const handleAdd = (e) => {
    e.stopPropagation();
    
    if (!canProcessSales) {
      toast.error('Please clock in before adding products.');
      return;
    }

    if (isExpired) {
      toast.error(`"${product.name}" has expired on ${new Date(product.expiry_date).toLocaleDateString()}.`);
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

    const productToAdd = {
      ...product,
      unit_price: displayPrice,
      selling_price: displayPrice
    };
    onAdd(productToAdd);
  };

  let cardStyle = 'border-surface-border hover:border-primary cursor-pointer active:scale-95';
  let statusText = `Qty: ${product.stock_quantity}`;
  let statusColor = 'text-text-faint';
  let isDisabled = false;

  if (!canProcessSales) {
    cardStyle = 'border-surface-border opacity-50 cursor-not-allowed';
    statusText = 'Clock in to add';
    statusColor = 'text-text-faint';
    isDisabled = true;
  } else if (isExpired) {
    cardStyle = 'border-danger opacity-60 cursor-not-allowed';
    statusText = 'Expired';
    statusColor = 'text-danger';
    isDisabled = true;
  } else if (outOfStock) {
    cardStyle = 'border-surface-border opacity-50 cursor-not-allowed';
    statusText = 'Out of stock';
    statusColor = 'text-danger';
    isDisabled = true;
  } else if (lowStock) {
    statusText = `Low: ${product.stock_quantity}`;
    statusColor = 'text-warning';
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isDisabled}
      className={`bg-surface-card border rounded-xl p-3 text-left transition-all w-full ${cardStyle}`}
    >
      {/* Category Badge */}
      {product.category_name && (
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {product.category_name}
        </span>
      )}
      
      {/* Wholesale Badge */}
      {isWholesale && product.wholesale_price && product.wholesale_price > 0 && (
        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full ml-1">
          Wholesale
        </span>
      )}
      
      {/* Product Name */}
      <p className="text-sm font-600 text-text-primary mt-2 leading-tight line-clamp-2">
        {product.name}
      </p>
      
      {/* Local Name */}
      {product.local_name && (
        <p className="text-xs text-text-muted mt-0.5">{product.local_name}</p>
      )}
      
      {/* VARIANT NAME - SIZE */}
      {variantDisplay && (
        <p className="text-xs font-500 text-text-faint mt-0.5">
          {variantDisplay}
        </p>
      )}
      
      {/* DESCRIPTION - Helps identify products */}
      {truncatedDescription && (
        <p className="text-xs text-text-muted mt-0.5 italic">
          {truncatedDescription}
        </p>
      )}
      
      {/* SKU (when searching) */}
      {showSku && product.sku && (
        <p className="text-xs text-text-faint font-mono mt-0.5">SKU: {product.sku}</p>
      )}
      
      {/* Price */}
      <div className="flex items-center gap-2 mt-2">
        <p className="text-primary font-700 text-base">
          {formatCurrency(displayPrice)}
        </p>
        {isWholesale && product.wholesale_price && product.wholesale_price > 0 && product.wholesale_price < product.selling_price && (
          <p className="text-xs text-text-muted line-through">
            {formatCurrency(product.selling_price)}
          </p>
        )}
      </div>
      
      {/* Status */}
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-xs font-500 ${statusColor}`}>
          {statusText}
        </span>
        {!isDisabled && <span className="text-primary text-lg font-300">+</span>}
      </div>
      
      {/* Expired Warning */}
      {isExpired && (
        <div className="mt-1 text-[10px] text-danger font-500">
          Expired: {new Date(product.expiry_date).toLocaleDateString()}
        </div>
      )}
      
      {/* Clock-in Warning */}
      {!canProcessSales && (
        <div className="mt-1 text-[10px] text-text-faint font-500">
          Clock in to add products
        </div>
      )}
    </button>
  );
};

export default ProductCard;