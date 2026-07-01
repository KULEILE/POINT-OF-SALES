import React, { useEffect, useState } from 'react';
import { reportService } from '../services/reportService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, sub, color = 'text-primary' }) => (
  <div className="k-card">
    <p className="text-xs font-600 text-text-faint uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-2xl font-800 ${color} tracking-tight`}>{value}</p>
    {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [expiredProducts, setExpiredProducts] = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.summary(),
      productService.getLowStock(),
      inventoryService.getExpiredProducts(),
      reportService.topProducts({ limit: 5 }),
    ]).then(([s, l, e, t]) => {
      setSummary(s.data.summary);
      setLowStock(l.data.products || []);
      setExpiredProducts(e.data.products || []);
      setTopProds(t.data.report || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Filter products that are truly low stock (not expired, not ok)
  const lowStockProducts = lowStock.filter(p => p.alert_status === 'LOW STOCK' || p.alert_status === 'OUT OF STOCK');
  const expiredProductsList = expiredProducts || [];
  const hasExpired = expiredProductsList.length > 0;
  const hasLowStock = lowStockProducts.length > 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-lg font-700 text-text-primary">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-text-muted">Here is your store overview for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Today Sales" 
          value={formatCurrency(summary?.today?.total || 0)} 
          sub={`${summary?.today?.count || 0} transactions`} 
        />
        <StatCard 
          label="This Week" 
          value={formatCurrency(summary?.week?.total || 0)} 
          sub={`${summary?.week?.count || 0} transactions`} 
          color="text-accent" 
        />
        <StatCard 
          label="This Month" 
          value={formatCurrency(summary?.month?.total || 0)} 
          sub={`${summary?.month?.count || 0} transactions`} 
          color="text-accent" 
        />
        <StatCard 
          label="Low Stock" 
          value={lowStockProducts.length} 
          sub="products need reorder" 
          color={lowStockProducts.length > 0 ? 'text-warning' : 'text-success'} 
        />
      </div>

      {/* Alerts Section */}
      {(hasExpired || hasLowStock) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {hasExpired && (
            <div className="k-card border-danger/30 bg-danger/5">
              <h3 className="text-sm font-700 text-danger mb-2">Expired Products Alert</h3>
              <p className="text-sm text-text-muted">
                {expiredProductsList.length} product(s) have expired and need to be removed from stock.
              </p>
              <ul className="mt-2 space-y-1">
                {expiredProductsList.slice(0, 3).map(p => (
                  <li key={p.product_id} className="text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-danger font-600">{p.stock_quantity} units expired</span>
                  </li>
                ))}
                {expiredProductsList.length > 3 && (
                  <li className="text-sm text-text-faint">+{expiredProductsList.length - 3} more expired products</li>
                )}
              </ul>
            </div>
          )}

          {hasLowStock && (
            <div className="k-card border-warning/30 bg-warning/5">
              <h3 className="text-sm font-700 text-warning mb-2">Low Stock Alert</h3>
              <p className="text-sm text-text-muted">
                {lowStockProducts.length} product(s) are running low.
              </p>
              <ul className="mt-2 space-y-1">
                {lowStockProducts.map(p => (
                  <li key={p.product_id} className="text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-warning font-600">{p.stock_quantity} units left</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Top Selling Products - Full Width */}
      <div className="k-card">
        <h3 className="text-sm font-700 text-text-primary mb-4">Top Selling Products</h3>
        {topProds.length === 0 ? (
          <p className="text-sm text-text-faint">No sales data available yet</p>
        ) : (
          <div className="space-y-3">
            {topProds.map((p, i) => (
              <div key={p.product_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-700 text-text-faint w-5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-500 text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-muted">{p.total_qty_sold} units sold</p>
                  </div>
                </div>
                <p className="text-sm font-700 text-primary">{formatCurrency(p.total_revenue)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;