import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const ReceiptModal = ({ 
  transaction, 
  cart, 
  total, 
  taxAmount, 
  onClose, 
  onNewSale, 
  paymentType,
  isWholesale,
  promotion,
  discountAmount
}) => {
  const isPaymentReceipt = paymentType === 'credit' || paymentType === 'layby';
  const isCreditPayment = paymentType === 'credit';
  const isLaybyPayment = paymentType === 'layby';
  
  // Only show duration for credit and layby sales
  const isCreditOrLaybySale = transaction?.payment_method === 'credit' || transaction?.payment_method === 'layby';

  const receiptTitle = isWholesale ? 'WHOLESALE INVOICE' : 'SALE RECEIPT';

  // Get promotion data from transaction or props
  const promoName = promotion?.name || transaction?.promotion_name || null;
  const promoDiscount = discountAmount || transaction?.discount_amount || 0;
  const hasPromotion = promoName && promoDiscount > 0;

  // Calculate original subtotal from cart
  const calculatedSubtotal = cart.reduce((sum, item) => {
    const price = item.unit_price || item.selling_price || 0;
    const qty = item.quantity || 0;
    return sum + (price * qty);
  }, 0);

  // Use subtotal from transaction or calculated
  const displaySubtotal = transaction?.subtotal || calculatedSubtotal;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-sm">
        <div className="p-5 border-b border-surface-border text-center">
          <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-success text-xl font-700">✓</span>
          </div>
          <h2 className="text-base font-700 text-text-primary">
            {isPaymentReceipt ? 'Payment Receipt' : receiptTitle}
          </h2>
          <p className="text-xs text-primary font-600 font-mono mt-1">{transaction?.receipt_number}</p>
          {isWholesale && !isPaymentReceipt && (
            <span className="text-xs font-600 bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">
              Wholesale
            </span>
          )}
          {hasPromotion && !isPaymentReceipt && (
            <span className="text-xs font-600 bg-success/10 text-success px-2 py-0.5 rounded-full mt-1 inline-block">
              Promotion Applied
            </span>
          )}
          {isPaymentReceipt && (
            <span className={`text-xs font-600 px-2 py-0.5 rounded-full mt-1 inline-block ${
              isCreditPayment ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent'
            }`}>
              {isCreditPayment ? 'Credit Payment' : 'Layby Payment'}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="bg-surface-bg rounded-xl p-4 font-mono text-xs space-y-1 mb-4">
            <p className="text-center font-700 text-text-primary text-sm mb-2">K-POINT OF SALES</p>
            <p className="text-center text-text-muted text-xs">{transaction && formatDateTime(transaction.transaction_date)}</p>

            <div className="text-text-muted text-xs space-y-0.5 mt-2">
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span className="font-600">{transaction?.cashier_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-600 capitalize">{transaction?.payment_method || 'N/A'}</span>
              </div>
              {transaction?.customer_phone && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-600">{transaction.customer_phone}</span>
                </div>
              )}
              {isWholesale && !isPaymentReceipt && (
                <div className="flex justify-between">
                  <span>Sale Type:</span>
                  <span className="font-600 text-primary">Wholesale</span>
                </div>
              )}
              {isCreditOrLaybySale && (transaction?.duration_days || transaction?.due_date) && (
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-600">{transaction?.duration_days || 30} days</span>
                </div>
              )}
              {isCreditOrLaybySale && transaction?.due_date && (
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span className="font-600">{formatDateTime(transaction.due_date)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-surface-border my-2" />

            {isPaymentReceipt ? (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between font-700 text-text-primary">
                    <span>Payment Amount</span>
                    <span className="text-primary">{formatCurrency(transaction?.total_amount || 0)}</span>
                  </div>
                  {transaction?.balance_due !== undefined && parseFloat(transaction.balance_due) > 0 && (
                    <div className="flex justify-between text-text-muted text-[10px]">
                      <span>Remaining Balance</span>
                      <span>{formatCurrency(transaction.balance_due)}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-text-muted text-[10px] font-600 uppercase">
                  <span className="flex-1">Item</span>
                  <span className="w-16 text-center">Unit Price</span>
                  <span className="w-8 text-center">Qty</span>
                  <span className="w-20 text-right">Amount</span>
                </div>

                {cart && cart.map((item, i) => {
                  const price = item.unit_price || item.selling_price;
                  return (
                    <div key={i} className="flex justify-between text-text-muted">
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="w-16 text-center">{formatCurrency(price)}</span>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <span className="w-20 text-right">{formatCurrency(price * item.quantity)}</span>
                    </div>
                  );
                })}

                <div className="border-t border-dashed border-surface-border my-2" />

                <div className="space-y-1">
                  {/* Show original subtotal */}
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal</span>
                    <span className="w-24 text-right">{formatCurrency(displaySubtotal)}</span>
                  </div>
                  
                  {/* Show promotion discount if applied */}
                  {hasPromotion && (
                    <div className="flex justify-between text-success text-[10px]">
                      <span>Promotion: {promoName}</span>
                      <span>-{formatCurrency(promoDiscount)}</span>
                    </div>
                  )}
                  
                  {/* Show discounted subtotal if promotion applied */}
                  {hasPromotion && (
                    <div className="flex justify-between text-text-muted text-[10px]">
                      <span>Discounted Subtotal</span>
                      <span className="w-24 text-right">{formatCurrency(displaySubtotal - promoDiscount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-text-muted">
                    <span>VAT ({transaction?.tax_rate || 15}%)</span>
                    <span className="w-24 text-right">{formatCurrency(taxAmount)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-surface-border my-2" />

                <div className="flex justify-between font-700 text-text-primary text-sm">
                  <span>TOTAL</span>
                  <span className="w-24 text-right">{formatCurrency(total)}</span>
                </div>

                {transaction?.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-text-muted text-[10px]">
                      <span>Amount Paid</span>
                      <span className="w-24 text-right">{formatCurrency(transaction?.amount_paid || 0)}</span>
                    </div>
                    <div className="flex justify-between text-text-muted text-[10px]">
                      <span>Change</span>
                      <span className="w-24 text-right">{formatCurrency(transaction?.change_amount || 0)}</span>
                    </div>
                  </>
                )}

                {transaction?.payment_method === 'credit' && transaction?.balance_due > 0 && (
                  <div className="flex justify-between text-warning text-[10px]">
                    <span>Balance Due</span>
                    <span className="w-24 text-right">{formatCurrency(transaction?.balance_due || 0)}</span>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-dashed border-surface-border my-2" />

            <p className="text-center text-text-faint text-[10px]">
              Goods sold are not returnable without proof of purchase.
            </p>
            {transaction?.notes && (
              <p className="text-center text-text-faint text-[9px]">Note: {transaction.notes}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="k-btn-outline flex-1">Print Receipt</button>
            <button onClick={onNewSale} className="k-btn-primary flex-1">
              {isPaymentReceipt ? 'Done' : 'New Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;