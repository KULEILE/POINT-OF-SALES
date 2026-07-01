import React, { useState } from 'react';
import { saleService } from '../../services/saleService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const TransactionSearch = ({ onSelect, onClose }) => {
  const [searchType, setSearchType] = useState('receipt');
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Please enter a receipt number or customer name.');
      return;
    }

    setLoading(true);
    try {
      if (searchType === 'receipt') {
        const response = await saleService.getByReceipt(searchValue.trim());
        console.log('API Response:', response.data); // Debug log
        
        if (response.data.transaction) {
          // Ensure items are included in the transaction
          const transactionWithItems = {
            ...response.data.transaction,
            items: response.data.items || [],
            customer_name: response.data.transaction.customer_name || 'Walk-in Customer'
          };
          console.log('Transaction with items:', transactionWithItems);
          setResults([transactionWithItems]);
        } else {
          setResults([]);
          toast.info('No transaction found with that receipt number.');
        }
      } else {
        const response = await saleService.getAll({ 
          search: searchValue.trim(), 
          limit: 10 
        });
        setResults(response.data.sales || []);
        if (response.data.sales?.length === 0) {
          toast.info('No transactions found for this customer.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error(err.response?.data?.message || 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (transaction) => {
    console.log('Selected transaction:', transaction);
    // Make sure items are included
    const transactionWithItems = {
      ...transaction,
      items: transaction.items || []
    };
    onSelect(transactionWithItems);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-base font-700 text-text-primary">Find Transaction</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">Search By</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSearchType('receipt')}
                className={`p-2 rounded-xl border text-xs font-600 transition-all ${
                  searchType === 'receipt'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-surface-border text-text-muted hover:border-primary/50'
                }`}
              >
                Receipt Number
              </button>
              <button
                onClick={() => setSearchType('customer')}
                className={`p-2 rounded-xl border text-xs font-600 transition-all ${
                  searchType === 'customer'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-surface-border text-text-muted hover:border-primary/50'
                }`}
              >
                Customer Name
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">
              {searchType === 'receipt' ? 'Receipt Number' : 'Customer Name'}
            </p>
            <input
              type="text"
              className="k-input"
              placeholder={searchType === 'receipt' ? 'e.g., KPOS-20260701-0001' : 'Type customer name...'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className={`k-btn-primary w-full py-3 text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {results.length > 0 && (
            <div>
              <p className="text-xs font-600 text-text-muted uppercase tracking-wider mb-2">
                {results.length} transaction(s) found
              </p>
              <div className="space-y-2">
                {results.map((tx) => (
                  <button
                    key={tx.transaction_id}
                    onClick={() => handleSelect(tx)}
                    className="w-full p-3 rounded-xl border border-surface-border hover:border-primary transition-all text-left"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-600 text-text-primary text-sm">{tx.receipt_number}</p>
                        <p className="text-xs text-text-muted">{formatDateTime(tx.transaction_date)}</p>
                        <p className="text-xs text-text-muted">Customer: {tx.customer_name || 'Walk-in'}</p>
                        <p className="text-xs text-text-muted">Items: {tx.items?.length || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-700 text-primary">{formatCurrency(tx.total_amount)}</p>
                        <p className="text-xs text-text-muted capitalize">{tx.payment_method}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && searchValue && !loading && (
            <div className="text-center py-8 text-text-muted text-sm">
              No transactions found. Try a different search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionSearch;