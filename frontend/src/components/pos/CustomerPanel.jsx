import React, { useState, useEffect, useRef } from 'react';
import { customerService } from '../../services/customerService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// CustomerPanel — shown when sale mode is credit or layby
// Allows cashier to search existing customers or create a new one
// ─────────────────────────────────────────────────────────────
const CustomerPanel = ({ saleMode, selectedCustomer, onSelectCustomer, onClearCustomer }) => {
  const [search,      setSearch]      = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [newForm,     setNewForm]     = useState({ full_name: '', phone: '', customer_type: saleMode === 'credit' ? 'credit' : 'layby', credit_limit: 500 });
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Reset when mode changes
  useEffect(() => {
    setNewForm(f => ({ ...f, customer_type: saleMode === 'credit' ? 'credit' : 'layby' }));
  }, [saleMode]);

  // Debounced search
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await customerService.getAll({ search: search.trim(), limit: 8 });
        setResults(res.data.customers || []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    setSearch('');
    setResults([]);
    setShowResults(false);
    setShowNewForm(false);
  };

  const handleCreate = async () => {
    if (!newForm.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!newForm.phone.trim())     { toast.error('Phone number is required'); return; }
    setCreating(true);
    try {
      const res = await customerService.create({
        full_name:     newForm.full_name.trim(),
        phone:         newForm.phone.trim(),
        customer_type: newForm.customer_type,
        credit_limit:  parseFloat(newForm.credit_limit) || 500,
      });
      toast.success('Customer created and selected');
      handleSelect(res.data.customer);
      setShowNewForm(false);
      setNewForm({ full_name: '', phone: '', customer_type: saleMode === 'credit' ? 'credit' : 'layby', credit_limit: 500 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  const modeLabel   = saleMode === 'credit' ? 'Credit Sale' : 'Lay-by Sale';
  const modeColor   = saleMode === 'credit' ? 'text-warning' : 'text-accent';
  const borderColor = saleMode === 'credit' ? 'border-warning/30' : 'border-accent/30';
  const bgColor     = saleMode === 'credit' ? 'bg-warning/5' : 'bg-accent/5';

  return (
    <div className={`border rounded-xl p-4 mb-3 ${borderColor} ${bgColor}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={`text-xs font-700 uppercase tracking-wider ${modeColor}`}>{modeLabel}</p>
          <p className="text-xs text-text-muted mt-0.5">Customer required for this sale type</p>
        </div>
        {selectedCustomer && (
          <button
            onClick={onClearCustomer}
            className="text-xs text-text-faint hover:text-danger transition-colors border border-surface-border px-2 py-1 rounded-md"
          >
            Change
          </button>
        )}
      </div>

      {/* Selected customer display */}
      {selectedCustomer ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-700 text-text-primary truncate">{selectedCustomer.full_name}</p>
              <p className="text-xs text-text-muted mt-0.5">{selectedCustomer.phone || 'No phone'}</p>
            </div>
            <span className={`text-xs font-600 px-2 py-0.5 rounded-md ${
              selectedCustomer.customer_type === 'credit' ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent'
            }`}>
              {selectedCustomer.customer_type}
            </span>
          </div>

          {/* Credit info */}
          {saleMode === 'credit' && (
            <div className="mt-3 pt-3 border-t border-surface-border grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-text-faint">Credit Limit</p>
                <p className="text-sm font-700 text-text-primary">{formatCurrency(selectedCustomer.credit_limit || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-text-faint">Current Balance</p>
                <p className={`text-sm font-700 ${parseFloat(selectedCustomer.current_balance) > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatCurrency(selectedCustomer.current_balance || 0)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-text-faint">Available Credit</p>
                <p className={`text-sm font-700 ${
                  (parseFloat(selectedCustomer.credit_limit || 0) - parseFloat(selectedCustomer.current_balance || 0)) <= 0
                    ? 'text-danger' : 'text-success'
                }`}>
                  {formatCurrency(
                    Math.max(0, parseFloat(selectedCustomer.credit_limit || 0) - parseFloat(selectedCustomer.current_balance || 0))
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Layby info */}
          {saleMode === 'layby' && (
            <div className="mt-3 pt-3 border-t border-surface-border">
              <p className="text-xs text-text-faint">Previous lay-by balance</p>
              <p className={`text-sm font-700 ${parseFloat(selectedCustomer.current_balance) > 0 ? 'text-warning' : 'text-success'}`}>
                {formatCurrency(selectedCustomer.current_balance || 0)}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search box */}
          {!showNewForm && (
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                className="k-input text-sm py-2"
                placeholder="Search by name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => search.trim().length >= 2 && setShowResults(true)}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
                </div>
              )}

              {/* Dropdown results */}
              {showResults && results.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl overflow-hidden">
                  {results.map(c => (
                    <button
                      key={c.customer_id}
                      onClick={() => handleSelect(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-panel transition-colors border-b border-surface-border last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-600 text-text-primary truncate">{c.full_name}</p>
                          <p className="text-xs text-text-muted">{c.phone || 'No phone'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-text-faint">Balance</p>
                          <p className={`text-xs font-700 ${parseFloat(c.current_balance) > 0 ? 'text-danger' : 'text-success'}`}>
                            {formatCurrency(c.current_balance || 0)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showResults && results.length === 0 && !searching && search.trim().length >= 2 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg px-3 py-3 text-xs text-text-muted">
                  No customer found for "{search}"
                </div>
              )}
            </div>
          )}

          {/* New customer form */}
          {showNewForm && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  type="text"
                  className="k-input text-sm py-2"
                  placeholder="Customer full name"
                  value={newForm.full_name}
                  onChange={e => setNewForm({ ...newForm, full_name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1">Phone *</label>
                <input
                  type="tel"
                  className="k-input text-sm py-2"
                  placeholder="+266 5000 0000"
                  value={newForm.phone}
                  onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                />
              </div>
              {saleMode === 'credit' && (
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1">Credit Limit</label>
                  <input
                    type="number"
                    className="k-input text-sm py-2"
                    placeholder="500"
                    value={newForm.credit_limit}
                    onChange={e => setNewForm({ ...newForm, credit_limit: e.target.value })}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewForm(false)}
                  className="k-btn-outline flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className={`k-btn-primary flex-1 py-2 text-xs ${creating ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {creating ? 'Saving...' : 'Create & Select'}
                </button>
              </div>
            </div>
          )}

          {/* Actions row */}
          {!showNewForm && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-text-faint">Type at least 2 characters to search</p>
              <button
                onClick={() => { setShowNewForm(true); setSearch(''); setShowResults(false); }}
                className="text-xs text-primary hover:underline font-500 transition-colors"
              >
                + New customer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerPanel;
