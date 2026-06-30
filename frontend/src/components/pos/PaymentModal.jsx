import React, { useState } from 'react';
import { saleService } from '../../services/saleService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CASH_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'mobile', label: 'Mobile Money' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 45, label: '45 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
];

const PaymentModal = ({ total, cart, saleMode, selectedCustomer, isWholesale, onSuccess, onClose }) => {
  const [method, setMethod] = useState('cash');
  const [paid, setPaid] = useState('');
  const [deposit, setDeposit] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const isCashSale = saleMode === 'cash';
  const isCreditSale = saleMode === 'credit';
  const isLaybySale = saleMode === 'layby';

  const change = isCashSale && method === 'cash' && paid
    ? Math.max(0, parseFloat(paid) - total)
    : 0;

  const depositAmt = parseFloat(deposit) || 0;
  const laybyBalance = isLaybySale ? Math.max(0, total - depositAmt) : 0;

  const getDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + duration);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const canSubmit = (() => {
    if (isCashSale && method === 'cash') return parseFloat(paid) >= total;
    if (isCashSale) return true;
    if (isCreditSale) return !!selectedCustomer;
    if (isLaybySale) return !!selectedCustomer && depositAmt > 0 && depositAmt <= total;
    return true;
  })();

  const handleProcess = async () => {
    if (!canSubmit) {
      if (isCashSale && method === 'cash') toast.error('Amount paid is less than total');
      if (isLaybySale && depositAmt <= 0) toast.error('Please enter a deposit amount');
      if (isLaybySale && depositAmt > total) toast.error('Deposit cannot exceed total');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.selling_price,
          discount_applied: i.discount_applied || 0,
          tax_rate: i.tax_rate || 15,
          tax_exempt: i.tax_exempt || false,
        })),
        payment_method: isCreditSale ? 'credit' : isLaybySale ? 'layby' : method,
        amount_paid: isCreditSale ? 0
          : isLaybySale ? depositAmt
          : method === 'cash' ? parseFloat(paid) || total
          : total,
        customer_id: selectedCustomer?.customer_id || null,
        customer_phone: selectedCustomer?.phone || null,
        deposit_amount: isLaybySale ? depositAmt : null,
        balance_due: isLaybySale ? laybyBalance : isCreditSale ? total : 0,
        duration_days: isCreditSale || isLaybySale ? duration : null,
        is_wholesale: isWholesale || false,
        customer_type: isWholesale ? 'wholesale' : 'retail',
      };

      const res = await saleService.create(payload);
      toast.success(`Sale complete! Receipt: ${res.data.transaction.receipt_number}`);
      onSuccess(res.data.transaction);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saleTypeLabel = isWholesale ? 'Wholesale' : 'Retail';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-700 text-text-primary">
              {isCreditSale ? 'Credit Sale' : isLaybySale ? 'Lay-by Sale' : 'Process Payment'}
            </h2>
            <p className="text-sm text-primary font-600 mt-0.5">Total: {formatCurrency(total)}</p>
            {isWholesale && (
              <p className="text-xs text-primary font-500">Wholesale Mode</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors"
          >×</button>
        </div>

        <div className="p-5 space-y-5">

          {isCashSale && (
            <>
              <div>
                <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {CASH_METHODS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      className={`p-2.5 rounded-xl border text-xs font-600 transition-all
                        ${method === m.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-surface-border text-text-muted hover:border-primary/50'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'cash' && (
                <div>
                  <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Amount Received</p>
                  <input
                    type="number"
                    className="k-input"
                    placeholder={`M ${total.toFixed(2)}`}
                    value={paid}
                    onChange={e => setPaid(e.target.value)}
                    autoFocus
                  />
                  {paid && parseFloat(paid) >= total && (
                    <div className="mt-2 p-3 bg-primary/10 border border-primary/30 rounded-lg flex justify-between">
                      <span className="text-sm text-text-muted">Change</span>
                      <span className="text-sm font-700 text-primary">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {isCreditSale && selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-surface-bg border border-surface-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-600 text-text-muted uppercase tracking-wider">Customer Details</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-700 text-text-primary">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-text-muted">{selectedCustomer.phone || 'No phone'}</p>
                  </div>
                  <span className="text-xs font-600 bg-warning/10 text-warning px-2 py-0.5 rounded-md">Credit</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-surface-border">
                  <div>
                    <p className="text-xs text-text-faint">Credit Limit</p>
                    <p className="text-sm font-700 text-text-primary">{formatCurrency(selectedCustomer.credit_limit || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-faint">Current Owed</p>
                    <p className="text-sm font-700 text-danger">{formatCurrency(selectedCustomer.current_balance || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-faint">After This Sale</p>
                    <p className="text-sm font-700 text-warning">
                      {formatCurrency(parseFloat(selectedCustomer.current_balance || 0) + total)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">
                  Payment Duration <span className="text-danger">*</span>
                </p>
                <select
                  className="k-input"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-text-faint mt-1">
                  Due date: <span className="font-600">{getDueDate()}</span>
                </p>
              </div>

              <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                <p className="text-xs text-text-faint">Sale Amount</p>
                <p className="text-lg font-800 text-primary">{formatCurrency(total)}</p>
                <p className="text-xs text-text-muted mt-1">Due date: {getDueDate()}</p>
              </div>
            </div>
          )}

          {isLaybySale && selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-surface-bg border border-surface-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-600 text-text-muted uppercase tracking-wider">Customer Details</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-700 text-text-primary">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-text-muted">{selectedCustomer.phone || 'No phone'}</p>
                  </div>
                  <span className="text-xs font-600 bg-accent/10 text-accent px-2 py-0.5 rounded-md">Lay-by</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">
                  Payment Duration <span className="text-danger">*</span>
                </p>
                <select
                  className="k-input"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-text-faint mt-1">
                  Due date: <span className="font-600">{getDueDate()}</span>
                </p>
              </div>

              <div>
                <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">
                  Deposit Amount <span className="text-danger">*</span>
                </p>
                <input
                  type="number"
                  className="k-input"
                  placeholder="Enter deposit amount"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value)}
                  autoFocus
                  min="1"
                  max={total}
                />
                <p className="text-xs text-text-faint mt-1">Minimum deposit required to hold the goods</p>
              </div>

              {depositAmt > 0 && depositAmt <= total && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Total amount</span>
                    <span className="font-600 text-text-primary">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Deposit paid today</span>
                    <span className="font-600 text-success">{formatCurrency(depositAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-surface-border pt-2">
                    <span className="text-text-muted font-600">Remaining balance</span>
                    <span className="font-700 text-accent">{formatCurrency(laybyBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Due date</span>
                    <span className="font-600">{getDueDate()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-surface-bg border border-surface-border rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Items</span>
              <span className="text-text-primary font-500">{cart.length} product{cart.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-muted">Sale type</span>
              <span className={`font-600 capitalize ${isCreditSale ? 'text-warning' : isLaybySale ? 'text-accent' : isWholesale ? 'text-primary' : 'text-primary'}`}>
                {isCreditSale ? 'Credit' : isLaybySale ? 'Lay-by' : isWholesale ? 'Wholesale' : method}
              </span>
            </div>
            {(isCreditSale || isLaybySale) && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-text-muted">Duration</span>
                <span className="font-600">{duration} days</span>
              </div>
            )}
          </div>

          <button
            onClick={handleProcess}
            disabled={loading || !canSubmit}
            className={`k-btn-primary w-full py-3.5 text-sm font-700
              ${(!canSubmit || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' :
              isCreditSale ? `Record Credit Sale — ${formatCurrency(total)}` :
              isLaybySale ? `Confirm Lay-by — Deposit ${formatCurrency(depositAmt || 0)}` :
              `Confirm ${isWholesale ? 'Wholesale' : 'Payment'} — ${formatCurrency(total)}`}
          </button>

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;