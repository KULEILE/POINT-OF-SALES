import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const ReceiptModal = ({ transaction, cart, total, taxAmount, onClose, onNewSale }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-sm">
      <div className="p-5 border-b border-surface-border text-center">
        <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-success text-xl font-700">✓</span>
        </div>
        <h2 className="text-base font-700 text-text-primary">Sale Complete</h2>
        <p className="text-xs text-primary font-600 font-mono mt-1">{transaction?.receipt_number}</p>
      </div>
      <div className="p-5">
        <div className="bg-surface-bg rounded-xl p-4 font-mono text-xs space-y-1 mb-4">
          <p className="text-center font-700 text-text-primary text-sm mb-2">K-POINT OF SALES</p>
          <p className="text-center text-text-muted text-xs">{transaction && formatDateTime(transaction.transaction_date)}</p>
          <div className="border-t border-dashed border-surface-border my-2" />
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-text-muted">
              <span className="truncate max-w-[150px]">{item.name} x{item.quantity}</span>
              <span>{formatCurrency(item.selling_price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-surface-border my-2" />
          <div className="flex justify-between text-text-muted"><span>VAT</span><span>{formatCurrency(taxAmount)}</span></div>
          <div className="flex justify-between font-700 text-text-primary text-sm"><span>TOTAL</span><span>{formatCurrency(total)}</span></div>
          <div className="border-t border-dashed border-surface-border my-2" />
          <p className="text-center text-text-faint">Thank you for your business!</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="k-btn-outline flex-1">Print Receipt</button>
          <button onClick={onNewSale} className="k-btn-primary flex-1">New Sale</button>
        </div>
      </div>
    </div>
  </div>
);

export default ReceiptModal;
