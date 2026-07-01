import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { paymentService } from '../../services/paymentService';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'mobile', label: 'Mobile Money' },
  { key: 'credit', label: 'Credit' },
  { key: 'layby', label: 'Layby' },
];

const SplitPaymentModal = ({ total, transactionId, onSuccess, onClose }) => {
  const [splits, setSplits] = useState([]);
  const [remaining, setRemaining] = useState(total);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize with one split method
    setSplits([
      { payment_method: 'cash', amount: '', reference: '' }
    ]);
    setRemaining(total);
  }, [total]);

  const addSplit = () => {
    if (splits.length >= PAYMENT_METHODS.length) {
      toast.error('All payment methods already added.');
      return;
    }
    const usedMethods = splits.map(s => s.payment_method);
    const availableMethod = PAYMENT_METHODS.find(m => !usedMethods.includes(m.key));
    if (availableMethod) {
      setSplits([...splits, { payment_method: availableMethod.key, amount: '', reference: '' }]);
    }
  };

  const removeSplit = (index) => {
    if (splits.length <= 1) {
      toast.error('At least one payment method is required.');
      return;
    }
    const newSplits = splits.filter((_, i) => i !== index);
    setSplits(newSplits);
    // Recalculate remaining
    const totalSplit = newSplits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    setRemaining(Math.max(0, total - totalSplit));
  };

  const updateSplit = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index][field] = value;
    setSplits(newSplits);

    // Recalculate remaining
    const totalSplit = newSplits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    setRemaining(Math.max(0, total - totalSplit));
  };

  const handleSubmit = async () => {
    // Validate all splits have amounts
    const emptySplits = splits.filter(s => !s.amount || parseFloat(s.amount) <= 0);
    if (emptySplits.length > 0) {
      toast.error('Please enter valid amounts for all payment methods.');
      return;
    }

    // Check if total matches
    const totalSplit = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    if (Math.abs(totalSplit - total) > 0.01) {
      toast.error(`Total split amount (${formatCurrency(totalSplit)}) does not match total due (${formatCurrency(total)}).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        transaction_id: transactionId,
        splits: splits.map(s => ({
          payment_method: s.payment_method,
          amount: parseFloat(s.amount),
          reference: s.reference || null
        }))
      };

      const response = await paymentService.processSplitPayment(payload);
      toast.success('Split payment processed successfully.');
      onSuccess(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process split payment.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableMethods = () => {
    const usedMethods = splits.map(s => s.payment_method);
    return PAYMENT_METHODS.filter(m => !usedMethods.includes(m.key));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-700 text-text-primary">Split Payment</h2>
            <p className="text-sm text-text-muted mt-0.5">Total Due: {formatCurrency(total)}</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {splits.map((split, index) => (
            <div key={index} className="bg-surface-bg border border-surface-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <select
                    className="k-input flex-1 text-sm"
                    value={split.payment_method}
                    onChange={(e) => updateSplit(index, 'payment_method', e.target.value)}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.key} value={m.key} disabled={splits.some(s => s.payment_method === m.key && s !== split)}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="k-input w-32 text-sm"
                    placeholder="Amount"
                    value={split.amount}
                    onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                {splits.length > 1 && (
                  <button
                    onClick={() => removeSplit(index)}
                    className="text-text-faint hover:text-danger text-xl leading-none transition-colors ml-2"
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                type="text"
                className="k-input text-xs"
                placeholder="Reference (optional)"
                value={split.reference}
                onChange={(e) => updateSplit(index, 'reference', e.target.value)}
              />
            </div>
          ))}

          {getAvailableMethods().length > 0 && (
            <button
              onClick={addSplit}
              className="w-full py-2 text-xs text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-all"
            >
              + Add Payment Method
            </button>
          )}

          <div className="bg-surface-bg border border-surface-border rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-text-muted">Remaining to Allocate</span>
            <span className={`text-sm font-700 ${remaining > 0.01 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(remaining)}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="k-btn-outline flex-1 py-3 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || remaining > 0.01}
              className={`k-btn-primary flex-1 py-3 text-sm ${(loading || remaining > 0.01) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : 'Process Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentModal;