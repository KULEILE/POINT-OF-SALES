import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { shiftService } from '../services/shiftService';
import { returnService } from '../services/returnService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

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
  const [returnsSummary, setReturnsSummary] = useState(null);
  const [returnsList, setReturnsList] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const PIE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-card border border-surface-border rounded-lg p-3 shadow-lg">
          <p className="text-xs font-500 text-text-primary">{label}</p>
          <p className="text-sm font-700 text-primary">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

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
    if (tab === 'returns') {
      loadReturns();
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

  const loadReturns = async () => {
    setReturnsLoading(true);
    try {
      const [summaryRes, listRes] = await Promise.all([
        reportService.returnsSummary(),
        returnService.getAll({ limit: 20 })
      ]);
      setReturnsSummary(summaryRes.data || null);
      setReturnsList(listRes.data.returns || []);
    } catch (err) {
      console.error('Failed to load returns report:', err);
    } finally {
      setReturnsLoading(false);
    }
  };

  const tabs = [
    { key: 'daily', label: 'Daily Sales' },
    { key: 'products', label: 'Top Products' },
    { key: 'cashiers', label: 'Cashier Performance' },
    { key: 'profit', label: 'Profit & Loss' },
    { key: 'shifts', label: 'Shift Report' },
    { key: 'debtors', label: 'Debtors' },
    { key: 'returns', label: 'Returns' }
  ];

  // Prepare chart data for refund methods
  const getMethodChartData = () => {
    if (!returnsSummary) return [];
    return returnsSummary.by_method.map(m => ({
      name: m.refund_method.charAt(0).toUpperCase() + m.refund_method.slice(1),
      value: parseFloat(m.total_amount) || 0,
      count: m.return_count || 0
    }));
  };

  // Prepare chart data for top returned products
  const getTopProductsChartData = () => {
    if (!returnsSummary) return [];
    return returnsSummary.top_returned_products.slice(0, 6).map(p => ({
      name: p.product_name || 'Unknown',
      refunded: parseFloat(p.total_refunded) || 0,
      qty: p.total_qty_returned || 0
    }));
  };

  // Prepare chart data for top reasons
  const getTopReasonsChartData = () => {
    if (!returnsSummary) return [];
    return returnsSummary.top_reasons.slice(0, 6).map(r => ({
      name: r.reason || 'No reason',
      amount: parseFloat(r.total_amount) || 0,
      count: r.return_count || 0
    }));
  };

  // Prepare chart data for returns by cashier
  const getCashierChartData = () => {
    if (!returnsSummary) return [];
    return returnsSummary.by_cashier.slice(0, 6).map(c => ({
      name: c.cashier_name || 'Unknown',
      amount: parseFloat(c.total_amount) || 0,
      count: c.return_count || 0
    }));
  };

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

      {loading && tab !== 'shifts' && tab !== 'debtors' && tab !== 'returns' ? (
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

          {tab === 'returns' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-text-muted">Returns and refunds overview</p>
                <button
                  onClick={loadReturns}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>

              {returnsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {returnsSummary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="k-card">
                        <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Total Refunded</p>
                        <p className="text-2xl font-800 text-danger tracking-tight">
                          {formatCurrency(returnsSummary.summary.total_refunded)}
                        </p>
                      </div>
                      <div className="k-card">
                        <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Total Returns</p>
                        <p className="text-2xl font-800 text-text-primary tracking-tight">
                          {returnsSummary.summary.total_returns}
                        </p>
                      </div>
                      <div className="k-card">
                        <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Avg Refund</p>
                        <p className="text-2xl font-800 text-warning tracking-tight">
                          {formatCurrency(returnsSummary.summary.avg_refund)}
                        </p>
                      </div>
                      <div className="k-card">
                        <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">Return Rate</p>
                        <p className="text-2xl font-800 text-accent tracking-tight">
                          {returnsSummary.summary.return_rate != null
                            ? `${returnsSummary.summary.return_rate.toFixed(1)}%`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CHARTS - All bar charts now VERTICAL */}
                  {returnsSummary && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                      {/* Refund Method Pie Chart */}
                      <div className="k-card">
                        <div className="px-4 py-3 border-b border-surface-border">
                          <p className="text-xs font-600 text-text-primary uppercase tracking-wider">Refund Methods</p>
                        </div>
                        <div className="p-4">
                          {getMethodChartData().length === 0 ? (
                            <p className="text-center text-text-faint py-8">No data available</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={getMethodChartData()}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  labelLine={true}
                                >
                                  {getMethodChartData().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* Top Returned Products - VERTICAL Bar Chart */}
                      <div className="k-card">
                        <div className="px-4 py-3 border-b border-surface-border">
                          <p className="text-xs font-600 text-text-primary uppercase tracking-wider">Top Returned Products</p>
                        </div>
                        <div className="p-4">
                          {getTopProductsChartData().length === 0 ? (
                            <p className="text-center text-text-faint py-8">No data available</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart
                                data={getTopProductsChartData()}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} angle={-15} textAnchor="end" height={60} />
                                <YAxis stroke="#9CA3AF" fontSize={11} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="refunded" fill="#EF4444" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* Top Reasons - VERTICAL Bar Chart */}
                      <div className="k-card">
                        <div className="px-4 py-3 border-b border-surface-border">
                          <p className="text-xs font-600 text-text-primary uppercase tracking-wider">Top Reasons</p>
                        </div>
                        <div className="p-4">
                          {getTopReasonsChartData().length === 0 ? (
                            <p className="text-center text-text-faint py-8">No data available</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart
                                data={getTopReasonsChartData()}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} angle={-15} textAnchor="end" height={60} />
                                <YAxis stroke="#9CA3AF" fontSize={11} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* Returns by Cashier - VERTICAL Bar Chart */}
                      <div className="k-card">
                        <div className="px-4 py-3 border-b border-surface-border">
                          <p className="text-xs font-600 text-text-primary uppercase tracking-wider">Returns by Cashier</p>
                        </div>
                        <div className="p-4">
                          {getCashierChartData().length === 0 ? (
                            <p className="text-center text-text-faint py-8">No data available</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart
                                data={getCashierChartData()}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
                                <YAxis stroke="#9CA3AF" fontSize={11} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ONLY ONE TABLE - Recent Returns */}
                  <div className="k-card p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-surface-border">
                      <p className="text-xs font-600 text-text-primary uppercase tracking-wider">Recent Returns</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="k-table w-full">
                        <thead>
                          <tr>
                            <th>Return #</th>
                            <th>Original Receipt</th>
                            <th>Customer</th>
                            <th>Cashier</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reason</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnsList.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-8 text-text-faint">No returns found</td></tr>
                          ) : returnsList.map((r) => (
                            <tr key={r.return_id}>
                              <td className="font-mono text-xs text-text-muted">{r.return_receipt_number}</td>
                              <td className="font-mono text-xs text-text-muted">{r.original_receipt || '—'}</td>
                              <td className="text-text-primary">{r.customer_name || 'Walk-in'}</td>
                              <td>{r.processed_by_name || r.cashier_name}</td>
                              <td className="text-danger font-600">{formatCurrency(r.refund_amount)}</td>
                              <td className="capitalize">{r.refund_method}</td>
                              <td className="text-xs">{r.reason}</td>
                              <td className="text-xs">{formatDateTime(r.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;