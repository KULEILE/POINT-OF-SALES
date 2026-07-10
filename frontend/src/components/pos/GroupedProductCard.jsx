import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const GroupedProductCard = ({ 
  groupName, 
  variantCount, 
  firstVariant, 
  onClick, 
  isWholesale,
  canProcessSales = true 
}) => {
  const displayPrice = isWholesale && firstVariant?.wholesale_price && firstVariant?.wholesale_price > 0
    ? firstVariant.wholesale_price 
    : firstVariant?.selling_price || 0;

  const isDisabled = !canProcessSales;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`bg-surface-card border rounded-xl p-3 text-left transition-all w-full
        ${isDisabled 
          ? 'border-surface-border opacity-50 cursor-not-allowed' 
          : 'border-surface-border hover:border-primary cursor-pointer active:scale-95'
        }`}
    >
      {firstVariant?.category_name && (
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {firstVariant.category_name}
        </span>
      )}
      {isWholesale && firstVariant?.wholesale_price && firstVariant?.wholesale_price > 0 && (
        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full ml-1">
          Wholesale
        </span>
      )}
      
      <p className="text-sm font-600 text-text-primary mt-2 leading-tight line-clamp-2">
        {groupName}
      </p>
      
      {firstVariant?.local_name && (
        <p className="text-xs text-text-muted mt-0.5">{firstVariant.local_name}</p>
      )}
      
      <div className="flex items-center gap-2 mt-2">
        <p className="text-primary font-700 text-base">
          {formatCurrency(displayPrice)}
        </p>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-500">
          {variantCount} Variants
        </span>
      </div>
      
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-text-faint">
          Click to view variants
        </span>
        <span className="text-primary text-lg font-300">→</span>
      </div>
    </button>
  );
};

export default GroupedProductCard;