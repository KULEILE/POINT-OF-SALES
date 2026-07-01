import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { returnService } from '../../services/returnService';
import toast from 'react-hot-toast';

const ReturnModal = ({ transaction, onSuccess, onClose }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Transaction received in ReturnModal:', transaction);
    console.log('Items:', transaction?.items);
    
    if (transaction && transaction.items && transaction.items.length > 0) {
      setSelectedItems(
        transaction.items.map(item => ({
          ...item,
          return_quantity: parseFloat(item.quantity) || 0,
          selected: true
        }))
      );
    } else {
      toast.error('No items found in this transaction.');
    }
  }, [transaction]);

  const toggleItem = (index) => {
    const newItems = [...selectedItems];
    newItems[index].selected = !newItems[index].selected;
    if (!newItems[index].selected) {
      newItems[index].return_quantity = 0;
    } else {
      newItems[index].return_quantity = parseFloat(newItems[index].quantity) || 0;
    }
    setSelectedItems(newItems);
  };

  const updateQuantity = (index, value) => {
    const newItems = [...selectedItems];
    const qty = parseFloat(value) || 0;
    const maxQty = parseFloat(newItems[index].quantity) || 0;
    if (qty <= maxQty && qty >= 0) {
      newItems[index].return_quantity = qty;
      if (qty > 0) {
        newItems[index].selected = true;
      } else {
        newItems[index].selected = false;
      }
      setSelectedItems(newItems);
    } else {
      toast.error(`Quantity cannot exceed ${maxQty}`);
    }
  };

  const calculateTotal = () => {
    return selectedItems
      .filter(item => item.selected && item.return_quantity > 0)
      .reduce((sum, item) => sum + (parseFloat(item.unit_price) || 0) * item.return_quantity, 0);
  };

  const handleSubmit = async () => {
    const itemsToReturn = selectedItems
      .filter(item => item.selected && item.return_quantity > 0)
      .map(item => ({
        item_id: item.item_id,
        quantity: item.return_quantity
      }));

    if (itemsToReturn.length === 0) {
      toast.error('Please select at least one item to return.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        original_transaction_id: transaction.transaction_id,
        customer_id: transaction.customer_id || null,
        items: itemsToReturn,
        refund_method: refundMethod,
        reason: reason || 'Customer return',
        notes: notes || ''
      };

      console.log('Return payload:', payload);

      const response = await returnService.create(payload);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Return processed successfully.');
        onSuccess(response.data);
      } else {
        toast.error(response.data.message || 'Failed to process return.');
      }
    } catch (err) {
      console.error('Return error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to process return. Please try again or contact support.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) {
    return null;
  }

  const totalRefund = calculateTotal();
  const itemCount = selectedItems.filter(item => item.selected && item.return_quantity > 0).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-700 text-text-primary">Process Return</h2>
            <p className="text-xs text-text-muted">
              Receipt: {transaction.receipt_number} | {formatDateTime(transaction.transaction_date)}
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
          {/* Customer Info */}
          <div className="bg-surface-bg border border-surface-border rounded-xl p-3">
            <p className="text-xs text-text-muted">Customer</p>
            <p className="text-sm font-600 text-text-primary">{transaction.customer_name || 'Walk-in Customer'}</p>
            {transaction.customer_phone && (
              <p className="text-xs text-text-muted">{transaction.customer_phone}</p>
            )}
          </div>

          {/* Items List */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Select Items to Return</p>
            {selectedItems.length === 0 ? (
              <div className="bg-surface-bg border border-surface-border rounded-lg p-4 text-center text-text-muted">
                No items available to return.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedItems.map((item, index) => (
                  <div key={index} className="bg-surface-bg border border-surface-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItem(index)}
                          className="w-4 h-4 rounded border-surface-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-500 text-text-primary">{item.product_name || 'Unknown Product'}</p>
                          <p className="text-xs text-text-muted">
                            {formatCurrency(item.unit_price)} × {item.quantity} units
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">Return:</span>
                        <input
                          type="number"
                          className="w-16 bg-surface-card border border-surface-border rounded-md px-2 py-1 text-xs text-text-primary outline-none focus:border-primary"
                          value={item.return_quantity}
                          onChange={(e) => updateQuantity(index, e.target.value)}
                          min="0"
                          max={item.quantity}
                          disabled={!item.selected}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refund Method */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Refund Method</p>
            <select
              className="k-input"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Money</option>
              <option value="store_credit">Store Credit</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Reason for Return</p>
            <select
              className="k-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Select a reason...</option>
              <option value="defective">Defective Product</option>
              <option value="wrong_item">Wrong Item</option>
              <option value="damaged">Damaged</option>
              <option value="changed_mind">Customer Changed Mind</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Notes (Optional)</p>
            <input
              type="text"
              className="k-input"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="bg-surface-bg border border-surface-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total Refund</span>
              <span className="font-700 text-primary">{formatCurrency(totalRefund)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Items to Return</span>
              <span className="font-600">{itemCount}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="k-btn-outline flex-1 py-3 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || totalRefund <= 0}
              className={`k-btn-primary flex-1 py-3 text-sm ${(loading || totalRefund <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : `Process Refund — ${formatCurrency(totalRefund)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;