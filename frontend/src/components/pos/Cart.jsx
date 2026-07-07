import React, { useState } from 'react';
import CartItem from './CartItem';
import { formatCurrency } from '../../utils/formatters';
import { promotionService } from '../../services/promotionService';

const Cart = ({ 
  cart, 
  subtotal, 
  taxAmount, 
  total, 
  itemCount, 
  onUpdateQty, 
  onRemove, 
  onUpdateDiscount, 
  onClear, 
  onCheckout,
  isWholesale,
  onHold,
  promotion,
  discountAmount,
  originalSubtotal,
  availablePromotions = [],
  isCalculatingPromotion = false,
  cartErrors = []
}) => {
  const [showPromotions, setShowPromotions] = useState(true);

  const hasPromotion = promotion && discountAmount > 0;
  const hasAvailablePromotions = availablePromotions.length > 0;
  const hasErrors = cartErrors.length > 0;
  
  const hasEligiblePromotions = availablePromotions.some(p => {
    const minPurchase = parseFloat(p.min_purchase) || 0;
    return minPurchase === 0 || originalSubtotal >= minPurchase;
  });

  const promoColor = hasPromotion ? promotionService.getPromotionColor(promotion) : '';
  const promoDescription = hasPromotion ? promotionService.formatPromotionDescription(promotion) : '';

  const totalSavings = cart.reduce((sum, item) => {
    const price = item.unit_price || item.selling_price;
    return sum + (price * item.quantity * (item.discount_applied || 0) / 100);
  }, 0) + discountAmount;

  return (
    <div className="flex flex-col h-full bg-surface-panel border-l border-surface-border">
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-700 text-text-primary">Current Sale</h2>
          <p className="text-xs text-text-muted">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {isCalculatingPromotion && ' Calculating...'}
          </p>
          {isWholesale && (
            <span className="text-xs text-primary font-600">Wholesale Mode</span>
          )}
          {hasPromotion && (
            <span className={`text-xs font-600 ml-1 px-1.5 py-0.5 rounded ${promoColor}`}>
              {promoDescription} Applied
            </span>
          )}
          {hasErrors && (
            <span className="text-xs text-danger font-600 ml-1">
              {cartErrors.length} issue{cartErrors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {cart.length > 0 && (
            <button 
              onClick={onHold}
              className="text-xs text-primary border border-primary/30 hover:border-primary px-2 py-1 rounded-md transition-all"
            >
              Hold Sale
            </button>
          )}
          <button 
            onClick={onClear} 
            className="text-xs text-text-faint hover:text-danger border border-surface-border hover:border-danger/50 px-2 py-1 rounded-md transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {hasErrors && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20">
          {cartErrors.map((error, index) => (
            <p key={index} className="text-xs text-danger font-500">
              {error.name}: {error.message}
            </p>
          ))}
        </div>
      )}

      {hasAvailablePromotions && (
        <div className="px-4 py-2 border-b border-surface-border bg-primary/5">
          <button
            onClick={() => setShowPromotions(!showPromotions)}
            className="flex items-center justify-between w-full text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-primary font-600">Available Promotions</span>
              <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                {availablePromotions.length}
              </span>
            </div>
            <span className="text-text-faint">
              {showPromotions ? '▲' : '▼'}
            </span>
          </button>

          {showPromotions && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {availablePromotions.map((promo) => {
                const minPurchase = parseFloat(promo.min_purchase) || 0;
                const isEligible = minPurchase === 0 || originalSubtotal >= minPurchase;
                const isApplied = promotion?.promotion_id === promo.promotion_id;
                const promoDisplay = promotionService.formatPromotionDescription(promo);
                const promoColorClass = promotionService.getPromotionColor(promo);

                return (
                  <div 
                    key={promo.promotion_id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all
                      ${isApplied 
                        ? 'bg-success/10 border border-success/30' 
                        : isEligible 
                          ? 'bg-surface-card border border-surface-border' 
                          : 'bg-surface-card border border-surface-border opacity-50'
                      }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-600 ${isApplied ? 'text-success' : 'text-text-primary'}`}>
                          {promo.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded ${promoColorClass} text-[10px]`}>
                          {promoDisplay}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-text-faint text-[10px] mt-0.5">{promo.description}</p>
                      )}
                      {minPurchase > 0 && (
                        <p className="text-text-faint text-[9px] mt-0.5">
                          Min. purchase: {formatCurrency(minPurchase)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isApplied ? (
                        <span className="text-success text-[10px] font-600">Applied</span>
                      ) : isEligible ? (
                        <span className="text-primary text-[10px] font-500">Eligible</span>
                      ) : (
                        <span className="text-text-faint text-[10px]">
                          Need {formatCurrency(minPurchase - originalSubtotal)} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-faint">
            <p className="text-3xl mb-2">—</p>
            <p className="text-sm font-500">Cart is empty</p>
            <p className="text-xs mt-1">Add products to start a sale</p>
          </div>
        ) : (
          cart.map(item => (
            <CartItem 
              key={item.product_id} 
              item={item} 
              onUpdateQty={onUpdateQty} 
              onRemove={onRemove} 
              onUpdateDiscount={onUpdateDiscount}
              isWholesale={isWholesale}
            />
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-surface-border p-4">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(originalSubtotal || subtotal)}</span>
            </div>
            
            {hasPromotion && (
              <div className="flex justify-between text-sm text-success font-600 bg-success/5 px-2 py-1 rounded-lg border border-success/20">
                <span className="flex items-center gap-1">
                  <span>Promotion: {promotion?.name}</span>
                  <span className="text-[10px] text-text-faint font-normal">
                    ({promoDescription})
                  </span>
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            
            {hasPromotion && (
              <div className="flex justify-between text-sm text-text-muted border-t border-dashed border-surface-border pt-1">
                <span className="font-500">Discounted Subtotal</span>
                <span className="font-600 text-text-primary">
                  {formatCurrency((originalSubtotal || subtotal) - discountAmount)}
                </span>
              </div>
            )}
            
            {isWholesale && (
              <div className="flex justify-between text-sm text-text-muted">
                <span>Sale Type</span>
                <span className="text-primary font-600">Wholesale</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm text-text-muted">
              <span>VAT (15%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            
            <div className="flex justify-between text-base font-700 text-text-primary border-t border-surface-border pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>

            {totalSavings > 0 && (
              <div className="flex justify-between text-xs text-success font-600">
                <span>Total Savings</span>
                <span>{formatCurrency(totalSavings)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button 
              onClick={onCheckout} 
              className="k-btn-primary w-full py-3.5 text-sm font-600"
              disabled={isCalculatingPromotion || hasErrors}
            >
              {isCalculatingPromotion ? 'Calculating...' : 'Process Payment'}
            </button>
            
            {hasErrors && (
              <p className="text-center text-[10px] text-danger font-500">
                Please fix stock issues before checkout
              </p>
            )}
            
            {hasAvailablePromotions && !hasPromotion && hasEligiblePromotions && !hasErrors && (
              <p className="text-center text-[10px] text-primary font-500">
                A promotion is available for this cart
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;