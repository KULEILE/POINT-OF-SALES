import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { formatCurrency, formatDate } from '../utils/formatters';

const Reports = () => {
  const [tab,        setTab]        = useState('daily');
  const [daily,      setDaily]      = useState([]);
  const [topProds,   setTopProds]   = useState([]);
  const [cashiers,   setCashiers]   = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([reportService.dailySales(), reportService.topProducts({ limit:10 }), reportService.cashierPerformance(), reportService.profitLoss()])
      .then(([d, t, c, p]) => { setDaily(d.data.report); setTopProds(t.data.report); setCashiers(c.data.report); setProfitLoss(p.data.report); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const tabs = [{ key:'daily', label:'Daily Sales' },{ key:'products', label:'Top Products' },{ key:'cashiers', label:'Cashier Performance' },{ key:'profit', label:'Profit & Loss' }];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6"><h2 className="text-lg font-700 text-text-primary">Reports</h2><p className="text-sm text-text-muted">Business performance overview</p></div>
      <div className="flex gap-2 mb-6 border-b border-surface-border pb-4">
        {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`text-sm font-500 px-4 py-2 rounded-lg transition-all ${tab === t.key ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary hover:bg-surface-card'}`}>{t.label}</button>)}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-surface-border border-t-primary rounded-full animate-spin" /></div> : (
        <>
          {tab === 'daily' && (
            <div className="k-card p-0 overflow-hidden"><table className="k-table"><thead><tr><th>Date</th><th>Transactions</th><th>Revenue</th><th>Tax</th><th>Cash</th><th>Card</th><th>Mobile</th><th>Credit</th></tr></thead>
              <tbody>{daily.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-text-faint">No data</td></tr>
              : daily.map((r,i) => <tr key={i}><td>{formatDate(r.sale_date)}</td><td>{r.total_transactions}</td><td className="text-primary font-600">{formatCurrency(r.total_revenue)}</td><td>{formatCurrency(r.total_tax)}</td><td>{formatCurrency(r.cash_total)}</td><td>{formatCurrency(r.card_total)}</td><td>{formatCurrency(r.mobile_total)}</td><td>{formatCurrency(r.credit_total)}</td></tr>)}</tbody>
            </table></div>
          )}
          {tab === 'products' && (
            <div className="k-card p-0 overflow-hidden"><table className="k-table"><thead><tr><th>#</th><th>Product</th><th>Category</th><th>Qty Sold</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
              <tbody>{topProds.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-text-faint">No data</td></tr>
              : topProds.map((p,i) => <tr key={i}><td className="text-text-faint font-700">{i+1}</td><td className="font-500 text-text-primary">{p.name}</td><td>{p.category||'—'}</td><td>{p.total_qty_sold}</td><td className="text-primary font-600">{formatCurrency(p.total_revenue)}</td><td>{formatCurrency(p.total_cost)}</td><td className="text-success font-600">{formatCurrency(p.total_profit)}</td></tr>)}</tbody>
            </table></div>
          )}
          {tab === 'cashiers' && (
            <div className="k-card p-0 overflow-hidden"><table className="k-table"><thead><tr><th>Cashier</th><th>Transactions</th><th>Total Sales</th><th>Avg Sale</th><th>Discounts Given</th></tr></thead>
              <tbody>{cashiers.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-text-faint">No data</td></tr>
              : cashiers.map((c,i) => <tr key={i}><td className="font-500 text-text-primary">{c.full_name}</td><td>{c.total_transactions||0}</td><td className="text-primary font-600">{formatCurrency(c.total_sales||0)}</td><td>{formatCurrency(c.avg_sale||0)}</td><td>{formatCurrency(c.total_discounts_given||0)}</td></tr>)}</tbody>
            </table></div>
          )}
          {tab === 'profit' && profitLoss && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[['Total Revenue', profitLoss.total_revenue, 'text-primary'],['Total Cost', profitLoss.total_cost, 'text-danger'],['Gross Profit', profitLoss.gross_profit, 'text-success'],['Total Tax', profitLoss.total_tax, 'text-warning'],['Total Discounts', profitLoss.total_discounts, 'text-text-muted'],['Transactions', profitLoss.total_transactions, 'text-accent']].map(([l,v,c]) => (
                <div key={l} className="k-card"><p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">{l}</p><p className={`text-2xl font-800 ${c} tracking-tight`}>{l==='Transactions' ? v : formatCurrency(v)}</p></div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
