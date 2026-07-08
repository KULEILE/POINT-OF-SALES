import React, { useState } from 'react';
import { useShift } from '../../context/ShiftContext';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ShiftModal = ({ type, onClose, onSuccess }) => {
  const { clockIn, clockOut, currentShift, shiftSales, shiftTransactions } = useShift();
  const [startingFloat, setStartingFloat] = useState('');
  const [endingCash, setEndingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isClockIn = type === 'clock-in';
  const isClockOut = type === 'clock-out';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (isClockIn) {
      const float = parseFloat(startingFloat) || 0;
      result = await clockIn(float, notes);
    } else {
      const cash = parseFloat(endingCash) || 0;
      result = await clockOut(cash, notes);
    }

    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-700 text-text-primary">
            {isClockIn ? 'Clock In' : 'Clock Out'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isClockIn ? (
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Starting Float
              </label>
              <input
                type="number"
                className="k-input"
                placeholder="0.00"
                value={startingFloat}
                onChange={(e) => setStartingFloat(e.target.value)}
                min="0"
                step="0.01"
              />
              <p className="text-xs text-text-faint mt-1">
                Amount of cash in the register at start of shift
              </p>
            </div>
          ) : (
            <>
              <div className="bg-surface-bg border border-surface-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Sales Total</span>
                  <span className="font-600 text-primary">{formatCurrency(shiftSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Transactions</span>
                  <span className="font-600">{shiftTransactions}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-surface-border pt-2">
                  <span className="text-text-muted">Starting Float</span>
                  <span className="font-600">{formatCurrency(currentShift?.starting_float || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Expected Cash</span>
                  <span className="font-600">
                    {formatCurrency((currentShift?.starting_float || 0) + shiftSales)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Ending Cash <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="Enter actual cash count"
                  value={endingCash}
                  onChange={(e) => setEndingCash(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-text-faint mt-1">
                  Actual cash counted in the register at end of shift
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              className="k-input"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="k-btn-outline flex-1 py-3 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`k-btn-primary flex-1 py-3 text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : isClockIn ? 'Clock In' : 'Clock Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;