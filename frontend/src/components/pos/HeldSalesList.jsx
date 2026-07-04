import React, { useState } from 'react';
import { holdService } from '../../services/holdService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const HoldSaleModal = ({ cart, total, itemCount, onSuccess, onClose }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Cannot hold an empty cart. Please add items first.');
      return;
    }

    setLoading(true);
    try {
      const cartData = cart.map(item => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price || item.selling_price,
        selling_price: item.selling_price,
        discount_applied: item.discount_applied || 0,
        tax_rate: item.tax_rate || 15,
        tax_exempt: item.tax_exempt || false,
        stock_quantity: item.stock_quantity
      }));

      const payload = {
        customer_name: null,
        customer_phone: null,
        cart_data: cartData,
        notes: notes || null
      };

      const response = await holdService.create(payload);
      toast.success(response.data.message || 'Sale held successfully.');
      onSuccess(response.data.hold);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to hold sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-700 text-text-primary">Hold Sale</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {itemCount} items — {formatCurrency(total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface-bg border border-surface-border rounded-xl p-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Items</span>
              <span className="font-600 text-text-primary">{itemCount}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-muted">Total</span>
              <span className="font-700 text-primary">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-faint mt-1">
              <span>Held sale expires after 24 hours</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              className="k-input"
              placeholder="Add notes (e.g., customer waiting for husband)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="k-btn-outline flex-1 py-3 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || cart.length === 0}
              className={`k-btn-primary flex-1 py-3 text-sm ${(loading || cart.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Holding...' : 'Hold Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldSaleModal;