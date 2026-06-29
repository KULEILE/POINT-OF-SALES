import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { formatCurrency, stockStatusColor } from '../utils/formatters';
import Modal from '../components/common/Modal';
import BulkAdjustModal from '../components/inventory/BulkAdjustModal';
import StockTransferModal from '../components/inventory/StockTransferModal';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: '',
    movement_type: 'adjustment',
    quantity: '',
    notes: '',
    unit_cost: '',
    expiry_date: ''
  });

  const load = () => {
    setLoading(true);
    inventoryService.getStatus()
      .then(r => setInventory(r.data.inventory))
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    productService.getAll({ limit: 500 })
      .then(r => setProducts(r.data.products))
      .catch(() => {});
  }, []);

  const handleAdjust = async () => {
    if (!form.product_id || !form.quantity) {
      toast.error('Please select a product and enter a quantity.');
      return;
    }
    try {
      await inventoryService.adjust(form);
      toast.success('Stock adjusted successfully.');
      setShowAdjustModal(false);
      setForm({ product_id: '', movement_type: 'adjustment', quantity: '', notes: '', unit_cost: '', expiry_date: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock. Please try again.');
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-700 text-text-primary">Inventory</h2>
          <p className="text-sm text-text-muted">{inventory.length} products tracked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransferModal(true)} className="k-btn-outline">Transfer Stock</button>
          <button onClick={() => setShowBulkModal(true)} className="k-btn-outline">Bulk Adjust</button>
          <button onClick={() => setShowAdjustModal(true)} className="k-btn-primary">Adjust Stock</button>
        </div>
      </div>

      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Cost Price</th>
              <th>Stock Value</th>
              <th>Expiry Date</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-text-faint">Loading inventory...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-text-faint">No products in inventory</td></tr>
            ) : inventory.map(p => {
              const isExpired = p.expiry_date && new Date(p.expiry_date) <= new Date();
              return (
                <tr key={p.product_id}>
                  <td><div className="font-500 text-text-primary">{p.name}</div><div className="text-xs font-mono text-text-faint">{p.sku}</div></td>
                  <td>{p.category || '—'}</td>
                  <td className="font-700">
                    <span className={p.stock_quantity <= 0 ? 'text-danger' : p.stock_quantity <= p.min_stock ? 'text-warning' : 'text-text-primary'}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td>{p.min_stock || 5}</td>
                  <td>{formatCurrency(p.cost_price)}</td>
                  <td className="text-primary font-600">{formatCurrency(p.stock_value)}</td>
                  <td>
                    {p.expiry_date ? (
                      <span className={isExpired ? 'text-danger font-600' : 'text-text-muted'}>
                        {new Date(p.expiry_date).toLocaleDateString()}
                        {isExpired && ' (Expired)'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{p.location || 'Main Store'}</td>
                  <td>
                    <span className={isExpired ? 'text-danger font-600' : stockStatusColor(p.stock_status)}>
                      {isExpired ? 'Expired' : p.stock_status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Single Adjust Modal */}
      <Modal open={showAdjustModal} onClose={() => setShowAdjustModal(false)} title="Adjust Stock">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Product *</label>
            <select className="k-input" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}>
              <option value="">Select product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} — Stock: {p.stock_quantity}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Movement Type *</label>
            <select className="k-input" value={form.movement_type} onChange={e => setForm({...form, movement_type: e.target.value})}>
              <option value="adjustment">Adjustment</option>
              <option value="purchase">Purchase (Add Stock)</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="damaged">Damaged (Remove Stock)</option>
              <option value="lost">Lost (Remove Stock)</option>
              <option value="return_in">Return In</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Quantity *</label>
            <input type="number" className="k-input" placeholder="Enter quantity" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Unit Cost</label>
            <input type="number" className="k-input" placeholder="Optional unit cost" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Notes</label>
            <input type="text" className="k-input" placeholder="Optional notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => setShowAdjustModal(false)} className="k-btn-outline">Cancel</button>
            <button onClick={handleAdjust} className="k-btn-primary">Save Adjustment</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Adjust Modal */}
      <BulkAdjustModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        products={products}
        onSuccess={load}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        open={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        products={products}
        onSuccess={load}
      />
    </div>
  );
};

export default Inventory;