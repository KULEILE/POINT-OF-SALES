import React, { useState, useEffect } from 'react';
import { returnService } from '../services/returnService';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    returnService.getAll(params)
      .then(r => setReturns(r.data.returns || []))
      .catch(() => toast.error('Failed to load returns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [dateFrom, dateTo]);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-700 text-text-primary">Returns</h2>
          <p className="text-sm text-text-muted">{returns.length} returns processed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-500 text-text-muted mb-1">Date From</label>
          <input
            type="date"
            className="k-input text-sm py-1.5"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-500 text-text-muted mb-1">Date To</label>
          <input
            type="date"
            className="k-input text-sm py-1.5"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button onClick={load} className="k-btn-outline text-sm py-1.5 px-4">
            Refresh
          </button>
        </div>
      </div>

      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead>
            <tr>
              <th>Return ID</th>
              <th>Original Receipt</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Refund Amount</th>
              <th>Method</th>
              <th>Processed By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-text-faint">Loading...</td></tr>
            ) : returns.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-text-faint">No returns found</td></tr>
            ) : (
              returns.map(r => (
                <tr key={r.return_id}>
                  <td className="font-mono text-xs">#{r.return_id}</td>
                  <td className="font-mono text-xs">{r.original_receipt}</td>
                  <td>{r.customer_name || 'Walk-in'}</td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td className="text-center">{r.item_count}</td>
                  <td className="font-600 text-primary">{formatCurrency(r.refund_amount)}</td>
                  <td className="capitalize">{r.refund_method}</td>
                  <td>{r.processed_by_name || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Returns;