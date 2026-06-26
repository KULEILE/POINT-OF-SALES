import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentService } from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatters';

const SettlementModal = ({ customer, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState('credit');
  const [amount, setAmount] = useState('');
  const [selectedLayby, setSelectedLayby] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (customer) {
      loadCustomerData();
    }
  }, [customer]);

  const loadCustomerData = async () => {
    try {
      const response = await paymentService.getCustomerPayments(customer.customer_id);
      setCustomerData(response.data);
    } catch (err) {
      toast.error('Failed to load customer data');
    }
  };

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setLoading(true);

    try {
      if (paymentType === 'credit') {
        const response = await paymentService.processCreditPayment({
          customer_id: customer.customer_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: 'Credit payment via settlement'
        });

        if (response.data.success) {
          toast.success(`Credit payment of ${formatCurrency(paymentAmount)} processed.`);
          onSuccess(response.data);
        }
      } else {
        if (!selectedLayby) {
          toast.error('Please select a layby transaction.');
          setLoading(false);
          return;
        }

        const response = await paymentService.processLaybyPayment({
          transaction_id: selectedLayby.transaction_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: 'Layby payment via settlement'
        });

        if (response.data.success) {
          toast.success(response.data.message);
          onSuccess(response.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maxAmount = paymentType === 'credit' 
    ? (customerData?.total_credit_balance || 0)
    : (selectedLayby?.balance_due || 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-700 text-text-primary">Settle Debt</h2>
            <p className="text-sm text-text-muted mt-0.5">{customer?.full_name}</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Payment Type Selection */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Payment Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentType('credit')}
                className={`p-3 rounded-xl border text-xs font-600 transition-all ${
                  paymentType === 'credit'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-surface-border text-text-muted hover:border-primary/50'
                }`}
              >
                Credit Payment
              </button>
              <button
                onClick={() => setPaymentType('layby')}
                className={`p-3 rounded-xl border text-xs font-600 transition-all ${
                  paymentType === 'layby'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-surface-border text-text-muted hover:border-primary/50'
                }`}
              >
                Layby Payment
              </button>
            </div>
          </div>

          {/* Customer Balance Info */}
          {customerData && (
            <div className="bg-surface-bg border border-surface-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Current Balance</span>
                <span className="font-700 text-warning">
                  {formatCurrency(customerData.total_credit_balance || 0)}
                </span>
              </div>
              {customerData.open_layby_count > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Open Laybys</span>
                  <span className="font-600">{customerData.open_layby_count}</span>
                </div>
              )}
            </div>
          )}

          {/* Layby Selection */}
          {paymentType === 'layby' && customerData?.layby_transactions?.length > 0 && (
            <div>
              <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Select Layby</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {customerData.layby_transactions.map((layby) => (
                  <button
                    key={layby.transaction_id}
                    onClick={() => setSelectedLayby(layby)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedLayby?.transaction_id === layby.transaction_id
                        ? 'border-accent bg-accent/10'
                        : 'border-surface-border hover:border-accent/50'
                    }`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-600">{layby.receipt_number}</span>
                      <span className="text-accent font-600">
                        {formatCurrency(layby.balance_due)} remaining
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted mt-1">
                      <span>Total: {formatCurrency(layby.total_amount)}</span>
                      <span>Paid: {formatCurrency(layby.amount_paid)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentType === 'layby' && customerData?.layby_transactions?.length === 0 && (
            <div className="bg-surface-bg border border-surface-border rounded-xl p-4 text-center text-text-muted text-sm">
              No open layby transactions found.
            </div>
          )}

          {/* Amount Input */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">
              Amount to Pay
            </p>
            <input
              type="number"
              className="k-input"
              placeholder="Enter payment amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              max={maxAmount || undefined}
              autoFocus
            />
            {maxAmount > 0 && (
              <p className="text-xs text-text-faint mt-1">
                Maximum: {formatCurrency(maxAmount)}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Payment Method</p>
            <select 
              className="k-input" 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Money</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
            className={`k-btn-primary w-full py-3.5 text-sm font-700 ${
              (loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount) 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {loading 
              ? 'Processing...' 
              : `Process ${paymentType === 'credit' ? 'Credit' : 'Layby'} Payment — ${formatCurrency(parseFloat(amount) || 0)}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;