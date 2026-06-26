import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { customerService } from '../../services/customerService';
import { formatCurrency } from '../../utils/formatters';

const CustomerSelectModal = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length > 1) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [search]);

  const searchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getAll({ search });
      setCustomers(response.data.customers || []);
    } catch (err) {
      toast.error('Failed to search customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (customer) => {
    onSelect(customer);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-700 text-text-primary">Select Customer</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5">
          <input
            type="text"
            className="k-input"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="text-center py-8 text-text-muted">Searching...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              {search.length > 1 ? 'No customers found' : 'Type to search customers'}
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => {
                const hasBalance = parseFloat(customer.current_balance) > 0;
                const isOverdue = customer.is_overdue || false;
                const daysRemaining = customer.days_remaining !== null ? customer.days_remaining : null;

                return (
                  <button
                    key={customer.customer_id}
                    onClick={() => handleSelect(customer)}
                    className="w-full p-3 rounded-xl border border-surface-border hover:border-primary transition-all text-left"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-600 text-text-primary">{customer.full_name}</p>
                        <p className="text-xs text-text-muted">{customer.phone || 'No phone'}</p>
                        <p className="text-xs text-text-muted capitalize">{customer.customer_type?.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-600 ${hasBalance ? 'text-warning' : 'text-success'}`}>
                          {formatCurrency(customer.current_balance || 0)}
                        </p>
                        <p className="text-xs text-text-faint">Balance</p>
                      </div>
                    </div>
                    {hasBalance && isOverdue && (
                      <div className="mt-1">
                        <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                          Overdue
                        </span>
                      </div>
                    )}
                    {hasBalance && !isOverdue && daysRemaining !== null && daysRemaining >= 0 && (
                      <div className="mt-1">
                        <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                          {daysRemaining} days remaining
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectModal;