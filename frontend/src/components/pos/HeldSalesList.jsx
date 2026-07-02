import React, { useState, useEffect } from 'react';
import { holdService } from '../../services/holdService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const HeldSalesList = ({ onSelect, onClose }) => {
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHolds();
  }, []);

  const loadHolds = async () => {
    setLoading(true);
    try {
      const response = await holdService.getAll();
      setHolds(response.data.holds || []);
    } catch (err) {
      toast.error('Failed to load held sales.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (hold) => {
    try {
      const response = await holdService.resume(hold.hold_id);
      toast.success('Sale resumed successfully.');
      onSelect(response.data.hold);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume sale.');
    }
  };

  const handleRemove = async (holdId) => {
    if (!confirm('Are you sure you want to cancel this held sale?')) {
      return;
    }
    try {
      await holdService.remove(holdId);
      toast.success('Held sale cancelled.');
      loadHolds();
    } catch (err) {
      toast.error('Failed to cancel held sale.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-700 text-text-primary">Held Sales</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : holds.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p className="text-sm">No held sales found.</p>
              <p className="text-xs mt-1">Hold a sale to save it for later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {holds.map((hold) => (
                <div key={hold.hold_id} className="bg-surface-bg border border-surface-border rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-600 text-text-primary">{hold.customer_name || 'Walk-in Customer'}</p>
                      {hold.customer_phone && (
                        <p className="text-xs text-text-muted">{hold.customer_phone}</p>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        {hold.items_count} items • {formatCurrency(hold.total_amount)}
                      </p>
                      <p className="text-xs text-text-faint">
                        Held: {formatDateTime(hold.created_at)}
                      </p>
                      {hold.notes && (
                        <p className="text-xs text-text-muted mt-1">Note: {hold.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleResume(hold)}
                        className="text-xs text-primary hover:underline font-600"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => handleRemove(hold.hold_id)}
                        className="text-xs text-text-faint hover:text-danger"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-surface-border">
          <button onClick={loadHolds} className="k-btn-outline w-full py-2 text-sm">
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeldSalesList;