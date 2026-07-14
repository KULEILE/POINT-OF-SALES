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
  const [errors, setErrors] = useState({});

  const isClockIn = type === 'clock-in';
  const isClockOut = type === 'clock-out';

  // Calculate expected cash correctly
  const startingFloatAmount = parseFloat(currentShift?.starting_float) || 0;
  const salesTotal = parseFloat(shiftSales) || 0;
  const expectedCash = startingFloatAmount + salesTotal;

  // Calculate difference
  const actualCash = parseFloat(endingCash) || 0;
  const difference = actualCash - expectedCash;
  const hasDifference = difference !== 0;

  const validateClockOut = () => {
    const newErrors = {};
    
    // Validate ending cash
    if (!endingCash || endingCash.trim() === '') {
      newErrors.endingCash = 'Ending cash is required. Please enter the actual cash count.';
    } else if (parseFloat(endingCash) < 0) {
      newErrors.endingCash = 'Ending cash cannot be negative.';
    }
    
    // If there's a cash difference, notes are required
    if (hasDifference && (!notes || notes.trim() === '')) {
      newErrors.notes = `Please explain why there is a ${difference > 0 ? 'surplus' : 'shortage'} of ${formatCurrency(Math.abs(difference))}.`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isClockOut) {
      const isValid = validateClockOut();
      if (!isValid) {
        return;
      }
    }

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

  const handleEndingCashChange = (value) => {
    setEndingCash(value);
    if (errors.endingCash) {
      setErrors({ ...errors, endingCash: '' });
    }
    if (errors.notes) {
      setErrors({ ...errors, notes: '' });
    }
  };

  const handleNotesChange = (value) => {
    setNotes(value);
    if (errors.notes) {
      setErrors({ ...errors, notes: '' });
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
                  <span className="font-600 text-primary">{formatCurrency(salesTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Transactions</span>
                  <span className="font-600">{shiftTransactions}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-surface-border pt-2">
                  <span className="text-text-muted">Starting Float</span>
                  <span className="font-600">{formatCurrency(startingFloatAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-surface-border pt-2">
                  <span className="text-text-muted font-600">Expected Cash</span>
                  <span className="font-700 text-primary text-base">{formatCurrency(expectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Ending Cash
                </label>
                <input
                  type="number"
                  className={`k-input ${errors.endingCash ? 'border-danger focus:border-danger' : ''}`}
                  placeholder="Enter actual cash count"
                  value={endingCash}
                  onChange={(e) => handleEndingCashChange(e.target.value)}
                  min="0"
                  step="0.01"
                />
                {errors.endingCash && (
                  <p className="text-xs text-danger mt-1.5 font-500">
                    {errors.endingCash}
                  </p>
                )}
                <p className="text-xs text-text-faint mt-1">
                  Actual cash counted in the register at end of shift
                </p>
              </div>

              {/* Difference Warning */}
              {hasDifference && !errors.endingCash && (
                <div className={`p-3 rounded-lg border ${difference > 0 ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
                  <p className={`text-sm font-600 ${difference > 0 ? 'text-success' : 'text-danger'}`}>
                    {difference > 0 ? 'Over' : 'Short'} by {formatCurrency(Math.abs(difference))}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Please explain the reason in the notes below.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
              Notes {hasDifference && <span className="text-danger">*</span>}
            </label>
            <input
              type="text"
              className={`k-input ${errors.notes ? 'border-danger focus:border-danger' : ''}`}
              placeholder={hasDifference ? 'Explanation required for cash difference' : 'Optional notes'}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
            {errors.notes && (
              <p className="text-xs text-danger mt-1.5 font-500">
                {errors.notes}
              </p>
            )}
            {!errors.notes && hasDifference && (
              <p className="text-xs text-text-faint mt-1">
                Please explain why there is a {difference > 0 ? 'surplus' : 'shortage'} of {formatCurrency(Math.abs(difference))}
              </p>
            )}
            {!hasDifference && (
              <p className="text-xs text-text-faint mt-1">
                Optional notes
              </p>
            )}
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