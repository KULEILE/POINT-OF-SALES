import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { shiftService } from '../services/shiftService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

const Reports = () => {
  const [tab, setTab] = useState('daily');
  const [daily, setDaily] = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [debtors, setDebtors] = useState([]);
  const [debtorTotals, setDebtorTotals] = useState(null);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportService.dailySales(),
      reportService.topProducts({ limit: 10 }),
      reportService.cashierPerformance(),
      reportService.profitLoss()
    ])
      .then(([d, t, c, p]) => {
        setDaily(d.data.report || []);
        setTopProds(t.data.report || []);
        setCashiers(c.data.report || []);
        setProfitLoss(p.data.report || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'shifts') {
      loadShifts();
    }
    if (tab === 'debtors') {
      loadDebtors();
    }
  }, [tab]);

  const loadShifts = async () => {
    setShiftsLoading(true);
    try {
      const response = await shiftService.getAllShifts({ limit: 50 });
      setShifts(response.shifts || []);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setShiftsLoading(false);
    }
  };

  const loadDebtors = async () => {
    setDebtorsLoading(true);
    try {
      const response = await reportService.debtors();
      setDebtors(response.data.report || []);
      setDebtorTotals(response.data.totals || null);
    } catch (err) {
      console.error('Failed to load debtors report:', err);
    } finally {
      setDebtorsLoading(false);
    }
  };

  const tabs = [
    { key: 'daily', label: 'Daily Sales' },
    { key: 'products', label: 'Top Products' },
    { key: 'cashiers', label: 'Cashier Performance' },
    { key: 'profit', label: 'Profit & Loss' },
    { key: 'shifts', label: 'Shift Report' },
    { key: 'debtors', label: 'Debtors' }
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-700 text-text-primary">Reports</h2>
        <p className="text-sm text-text-muted">Business performance overview</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-surface-border pb-4 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-500 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== 'shifts' && tab !== 'debtors' ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'daily' && (
            <div className="k-card p-0 overflow-hidden">
              <table className="k-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transactions</th>
                    <th>Revenue</th>
                    <th>Tax</th>
                    <th>Cash</th>
                    <th>Card</th>
                    <th>Mobile</th>
                    <th>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-text-faint">No data</td></tr>
                  ) : daily.map((r, i) => (
                    <tr key={i}>
                      <td>{formatDate(r.sale_date)}</td>
                      <td>{r.total_transactions}</td>
                      <td className="text-primary font-600">{formatCurrency(r.total_revenue)}</td>
                      <td>{formatCurrency(r.total_tax)}</td>
                      <td>{formatCurrency(r.cash_total)}</td>
                      <td>{formatCurrency(r.card_total)}</td>
                      <td>{formatCurrency(r.mobile_total)}</td>
                      <td>{formatCurrency(r.credit_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'products' && (
            <div className="k-card p-0 overflow-hidden">
              <table className="k-table w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {topProds.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-text-faint">No data</td></tr>
                  ) : topProds.map((p, i) => (
                    <tr key={i}>
                      <td className="text-text-faint font-700">{i + 1}</td>
                      <td className="font-500 text-text-primary">{p.name}</td>
                      <td>{p.category || '—'}</td>
                      <td>{p.total_qty_sold}</td>
                      <td className="text-primary font-600">{formatCurrency(p.total_revenue)}</td>
                      <td>{formatCurrency(p.total_cost)}</td>
                      <td className="text-success font-600">{formatCurrency(p.total_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'cashiers' && (
            <div className="k-card p-0 overflow-hidden">
              <table className="k-table w-full">
                <thead>
                  <tr>
                    <th>Cashier</th>
                    <th>Transactions</th>
                    <th>Total Sales</th>
                    <th>Avg Sale</th>
                    <th>Discounts Given</th>
                  </tr>
                </thead>
                <tbody>
                  {cashiers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-text-faint">No data</td></tr>
                  ) : cashiers.map((c, i) => (
                    <tr key={i}>
                      <td className="font-500 text-text-primary">{c.full_name}</td>
                      <td>{c.total_transactions || 0}</td>
                      <td className="text-primary font-600">{formatCurrency(c.total_sales || 0)}</td>
                      <td>{formatCurrency(c.avg_sale || 0)}</td>
                      <td>{formatCurrency(c.total_discounts_given || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'profit' && profitLoss && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Total Revenue', profitLoss.total_revenue, 'text-primary'],
                ['Total Cost', profitLoss.total_cost, 'text-danger'],
                ['Gross Profit', profitLoss.gross_profit, 'text-success'],
                ['Total Tax', profitLoss.total_tax, 'text-warning'],
                ['Total Discounts', profitLoss.total_discounts, 'text-text-muted'],
                ['Transactions', profitLoss.total_transactions, 'text-accent']
              ].map(([l, v, c]) => (
                <div key={l} className="k-card">
                  <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">{l}</p>
                  <p className={`text-2xl font-800 ${c} tracking-tight`}>
                    {l === 'Transactions' ? v : formatCurrency(v)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'shifts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-text-muted">Shift reports with sales and reconciliation</p>
                <button
                  onClick={loadShifts}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>

              {shiftsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="k-card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="k-table w-full">
                      <thead>
                        <tr>
                          <th>Shift #</th>
                          <th>Cashier</th>
                          <th>Clock In</th>
                          <th>Clock Out</th>
                          <th>Duration</th>
                          <th>Sales</th>
                          <th>Transactions</th>
                          <th>Float</th>
                          <th>Ending Cash</th>
                          <th>Difference</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.length === 0 ? (
                          <tr><td colSpan={11} className="text-center py-8 text-text-faint">No shifts found</td></tr>
                        ) : shifts.map((s) => {
                          const duration = s.clock_out
                            ? Math.floor((new Date(s.clock_out) - new Date(s.clock_in)) / (1000 * 60))
                            : 0;
                          const hours = Math.floor(duration / 60);
                          const mins = duration % 60;
                          const statusColors = {
                            open: 'bg-success/10 text-success',
                            closed: 'bg-warning/10 text-warning',
                            reconciled: 'bg-primary/10 text-primary'
                          };

                          return (
                            <tr key={s.shift_id}>
                              <td className="font-600 text-text-primary">#{s.shift_id}</td>
                              <td>{s.cashier_name}</td>
                              <td className="text-xs">{formatDateTime(s.clock_in)}</td>
                              <td className="text-xs">{s.clock_out ? formatDateTime(s.clock_out) : '—'}</td>
                              <td className="text-xs">
                                {s.clock_out ? `${hours}h ${mins}m` : 'Active'}
                              </td>
                              <td className="text-primary font-600">{formatCurrency(s.sales_total || 0)}</td>
                              <td>{s.transaction_count || 0}</td>
                              <td className="text-xs">{formatCurrency(s.starting_float)}</td>
                              <td className="text-xs">{formatCurrency(s.ending_cash || 0)}</td>
                              <td className={`font-600 ${(s.difference || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(s.difference || 0)}
                              </td>
                              <td>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[s.status] || 'bg-surface-border text-text-muted'}`}>
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'debtors' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-text-muted">Customers with an outstanding balance</p>
                <button
                  onClick={loadDebtors}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>

              {debtorTotals && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="k-card">
                    <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Total Owed</p>
                    <p className="text-2xl font-800 text-danger tracking-tight">
                      {formatCurrency(debtorTotals.total_owed)}
                    </p>
                  </div>
                  <div className="k-card">
                    <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Debtors</p>
                    <p className="text-2xl font-800 text-text-primary tracking-tight">
                      {debtorTotals.debtor_count}
                    </p>
                  </div>
                  <div className="k-card">
                    <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Overdue</p>
                    <p className="text-2xl font-800 text-warning tracking-tight">
                      {debtorTotals.overdue_count}
                    </p>
                  </div>
                </div>
              )}

              {debtorsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="k-card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="k-table w-full">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Phone</th>
                          <th>Balance</th>
                          <th>Credit Limit</th>
                          <th>Available Credit</th>
                          <th>Oldest Open Sale</th>
                          <th>Due Date</th>
                          <th>Last Payment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debtors.length === 0 ? (
                          <tr><td colSpan={9} className="text-center py-8 text-text-faint">No outstanding balances</td></tr>
                        ) : debtors.map((d) => (
                          <tr key={d.customer_id}>
                            <td className="font-500 text-text-primary">
                              {d.full_name}
                              {d.business_name && (
                                <div className="text-xs text-text-faint">{d.business_name}</div>
                              )}
                            </td>
                            <td className="text-xs">{d.phone || '—'}</td>
                            <td className="text-danger font-600">{formatCurrency(d.current_balance)}</td>
                            <td className="text-xs">{d.credit_limit != null ? formatCurrency(d.credit_limit) : '—'}</td>
                            <td className="text-xs">
                              {d.available_credit != null ? formatCurrency(d.available_credit) : '—'}
                            </td>
                            <td className="text-xs">
                              {d.oldest_transaction_date ? formatDate(d.oldest_transaction_date) : '—'}
                            </td>
                            <td className="text-xs">
                              {d.due_date ? formatDate(d.due_date) : '—'}
                            </td>
                            <td className="text-xs">
                              {d.last_payment_date ? (
                                <>
                                  {formatDate(d.last_payment_date)}
                                  <div className="text-text-faint">{formatCurrency(d.last_payment_amount)}</div>
                                </>
                              ) : '—'}
                            </td>
                            <td>
                              {d.is_overdue ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                                  Overdue {d.days_overdue}d
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-border text-text-muted">
                                  Current
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;