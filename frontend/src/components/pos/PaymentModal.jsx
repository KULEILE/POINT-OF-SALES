import React, { useState } from 'react';
import { saleService } from '../../services/saleService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const METHODS = [
  { key: 'cash',   label: 'Cash'         },
  { key: 'card',   label: 'Card'         },
  { key: 'mobile', label: 'Mobile Money' },
  { key: 'credit', label: 'Credit'       },
  { key: 'layby',  label: 'Lay-by'       },
];

const PaymentModal = ({ total, cart, onSuccess, onClose }) => {
  const [method,   setMethod]   = useState('cash');
  const [paid,     setPaid]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const change    = method === 'cash' && paid ? Math.max(0, parseFloat(paid) - total) : 0;
  const canSubmit = method !== 'cash' || parseFloat(paid) >= total;

  const handleProcess = async () => {
    if (!canSubmit) { toast.error('Amount paid is less than total'); return; }
    setLoading(true);
    try {
      const res = await saleService.create({
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.selling_price, discount_applied: i.discount_applied, tax_rate: i.tax_rate, tax_exempt: i.tax_exempt })),
        payment_method: method,
        amount_paid:    parseFloat(paid) || total,
        customer_phone: phone || null,
      });
      toast.success(`Sale complete! Receipt: ${res.data.transaction.receipt_number}`);
      onSuccess(res.data.transaction);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-700 text-text-primary">Process Payment</h2>
            <p className="text-sm text-primary font-600 mt-0.5">Total: {formatCurrency(total)}</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl">×</button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => (
                <button key={m.key} onClick={() => setMethod(m.key)} className={`p-2.5 rounded-xl border text-xs font-600 transition-all ${method === m.key ? 'border-primary bg-primary/10 text-primary' : 'border-surface-border text-text-muted hover:border-primary/50'}`}>{m.label}</button>
              ))}
            </div>
          </div>
          {method === 'cash' && (
            <div>
              <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Amount Received</p>
              <input type="number" placeholder={formatCurrency(total)} value={paid} onChange={e => setPaid(e.target.value)} className="k-input" autoFocus />
              {paid && parseFloat(paid) >= total && (
                <div className="mt-2 p-3 bg-primary/10 border border-primary/30 rounded-lg flex justify-between">
                  <span className="text-sm text-text-muted">Change</span>
                  <span className="text-sm font-700 text-primary">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Customer Phone (optional)</p>
            <input type="tel" placeholder="+266 5000 0000" value={phone} onChange={e => setPhone(e.target.value)} className="k-input" />
          </div>
          <button onClick={handleProcess} disabled={loading || !canSubmit} className={`k-btn-primary w-full py-3.5 ${(!canSubmit || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {loading ? 'Processing...' : `Confirm ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
