import React, { useState, useEffect, useRef } from 'react';
import { useShift } from '../../context/ShiftContext';
import { formatCurrency } from '../../utils/formatters';
import ShiftModal from '../shifts/ShiftModal';

const ShiftStatus = () => {
  const { currentShift, isClockedIn, shiftSales, shiftTransactions, loading, refreshShift } = useShift();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('clock-in');
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Set up periodic refresh every 30 seconds
  useEffect(() => {
    isMountedRef.current = true;

    // Initial refresh only if not loading and no shift data
    if (!loading && !currentShift) {
      refreshShift();
    }

    // Set up interval to refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        refreshShift();
      }
    }, 30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const handleClockIn = () => {
    setModalType('clock-in');
    setShowModal(true);
  };

  const handleClockOut = () => {
    setModalType('clock-out');
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    // Refresh immediately after clock in/out
    refreshShift();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="w-4 h-4 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isClockedIn ? (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-success/10 border border-success/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-xs font-500 text-success">Clocked In</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-text-muted">
            <span>Sales: {formatCurrency(shiftSales)}</span>
            <span className="text-text-faint">|</span>
            <span>{shiftTransactions} transactions</span>
          </div>
          <button
            onClick={handleClockOut}
            className="text-xs text-danger hover:underline font-500"
          >
            Clock Out
          </button>
        </div>
      ) : (
        <button
          onClick={handleClockIn}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-500 hover:bg-primary/90 transition-all"
        >
          Clock In
        </button>
      )}

      {showModal && (
        <ShiftModal
          type={modalType}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
};

export default ShiftStatus;