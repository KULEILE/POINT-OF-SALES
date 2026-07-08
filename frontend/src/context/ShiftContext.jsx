import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { shiftService } from '../services/shiftService';
import toast from 'react-hot-toast';

const ShiftContext = createContext(null);

export const ShiftProvider = ({ children }) => {
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftSales, setShiftSales] = useState(0);
  const [shiftTransactions, setShiftTransactions] = useState(0);
  const isMounted = useRef(true);
  const loadingRef = useRef(false);

  // Load current shift on mount only
  useEffect(() => {
    isMounted.current = true;
    loadCurrentShift();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadCurrentShift = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const response = await shiftService.getCurrentShift();
      
      if (!isMounted.current) return;
      
      if (response.success && response.shift) {
        setCurrentShift(response.shift);
        setShiftSales(parseFloat(response.shift.sales_total) || 0);
        setShiftTransactions(parseInt(response.shift.transaction_count) || 0);
      } else {
        setCurrentShift(null);
        setShiftSales(0);
        setShiftTransactions(0);
      }
    } catch (error) {
      console.error('[ShiftContext] loadCurrentShift error:', error);
      if (isMounted.current) {
        setCurrentShift(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, []);

  const clockIn = useCallback(async (startingFloat = 0, notes = '') => {
    try {
      const response = await shiftService.clockIn({
        starting_float: startingFloat,
        notes: notes
      });
      
      if (response.success) {
        setCurrentShift(response.shift);
        setShiftSales(0);
        setShiftTransactions(0);
        toast.success('Clocked in successfully.');
        return { success: true, shift: response.shift };
      } else {
        toast.error(response.message || 'Failed to clock in.');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to clock in.';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const clockOut = useCallback(async (endingCash = 0, notes = '') => {
    if (!currentShift) {
      toast.error('No open shift to close.');
      return { success: false, message: 'No open shift.' };
    }

    try {
      const response = await shiftService.clockOut({
        ending_cash: endingCash,
        notes: notes
      });
      
      if (response.success) {
        setCurrentShift(null);
        setShiftSales(0);
        setShiftTransactions(0);
        toast.success('Clocked out successfully.');
        return { success: true, shift: response.shift };
      } else {
        toast.error(response.message || 'Failed to clock out.');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to clock out.';
      toast.error(message);
      return { success: false, message };
    }
  }, [currentShift]);

  const refreshShift = useCallback(async () => {
    await loadCurrentShift();
  }, [loadCurrentShift]);

  const isClockedIn = currentShift !== null && currentShift.status === 'open';
  const canProcessSales = isClockedIn;

  const value = {
    currentShift,
    loading,
    shiftSales,
    shiftTransactions,
    isClockedIn,
    canProcessSales,
    clockIn,
    clockOut,
    refreshShift,
    loadCurrentShift
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used inside ShiftProvider');
  return ctx;
};