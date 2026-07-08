import React, { useState, useEffect, useCallback } from 'react';
import { holdService } from '../../services/holdService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const calculateHoldTotal = (cartData) => {
  const items = cartData || [];
  return items.reduce((sum, item) => {
    const price = item.unit_price || item.selling_price || 0;
    const qty = item.quantity || 0;
    const discount = item.discount_applied || 0;
    return sum + (price * qty * (1 - discount / 100));
  }, 0);
};

const HeldSalesList = ({ onSelect, onClose }) => {
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadHolds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await holdService.getAll();
      // holdService returns the raw axios response, so the body is under .data.
      // Defensive: the body's array may be under `holds`, or occasionally
      // missing entirely if there are none. Never assume it is present.
      const list = response?.data?.holds || response?.data || [];
      setHolds(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load held sales.');
      setHolds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolds();
  }, [loadHolds]);

  const handleResume = async (hold) => {
    if (!hold?.cart_data || hold.cart_data.length === 0) {
      toast.error('This held sale has no items and cannot be resumed.');
      return;
    }

    setBusyId(hold.hold_id);
    try {
      const response = await holdService.resume(hold.hold_id);
      const resumedHold = response?.data?.hold || hold;
      onSelect(resumedHold);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume sale. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (hold) => {
    setBusyId(hold.hold_id);
    try {
      await holdService.remove(hold.hold_id);
      setHolds(prev => prev.filter(h => h.hold_id !== hold.hold_id));
      toast.success('Held sale deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete held sale.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-surface-border flex-shrink-0">
          <div>
            <h2 className="text-base font-700 text-text-primary">Held Sales</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {holds.length} held sale{holds.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-surface-bg rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : holds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-text-faint">
              <p className="text-sm font-500">No held sales</p>
              <p className="text-xs mt-1">Sales you put on hold will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {holds.map(hold => {
                const items = hold.cart_data || [];
                const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const total = calculateHoldTotal(items);
                const isBusy = busyId === hold.hold_id;

                return (
                  <div
                    key={hold.hold_id}
                    className="bg-surface-bg border border-surface-border rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-700 text-text-primary truncate">
                        {hold.customer_name || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {itemCount} item{itemCount !== 1 ? 's' : ''} — {formatCurrency(total)}
                      </p>
                      {hold.notes && (
                        <p className="text-xs text-text-faint mt-0.5 truncate">{hold.notes}</p>
                      )}
                      {hold.created_at && (
                        <p className="text-[10px] text-text-faint mt-0.5">
                          Held {formatDateTime(hold.created_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDelete(hold)}
                        disabled={isBusy}
                        className={`text-xs text-danger hover:underline font-500 px-2 py-1.5 ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleResume(hold)}
                        disabled={isBusy}
                        className={`k-btn-primary text-xs px-3 py-1.5 ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isBusy ? 'Resuming...' : 'Resume'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default HeldSalesList;