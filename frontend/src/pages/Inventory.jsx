import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { productService }   from '../services/productService';
import { formatCurrency, stockStatusColor } from '../utils/formatters';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [products,  setProducts]  = useState([]);
  const [form, setForm] = useState({ product_id:'', movement_type:'adjustment', quantity:'', notes:'', unit_cost:'' });

  const load = () => {
    setLoading(true);
    inventoryService.getStatus().then(r => setInventory(r.data.inventory)).catch(() => toast.error('Failed to load inventory')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); productService.getAll({ limit: 500 }).then(r => setProducts(r.data.products)).catch(() => {}); }, []);

  const handleAdjust = async () => {
    if (!form.product_id || !form.quantity) { toast.error('Product and quantity are required'); return; }
    try {
      await inventoryService.adjust(form);
      toast.success('Stock adjusted successfully');
      setShowModal(false);
      setForm({ product_id:'', movement_type:'adjustment', quantity:'', notes:'', unit_cost:'' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg font-700 text-text-primary">Inventory</h2><p className="text-sm text-text-muted">{inventory.length} products tracked</p></div>
        <button onClick={() => setShowModal(true)} className="k-btn-primary">Adjust Stock</button>
      </div>
      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Reorder At</th><th>Cost Price</th><th>Stock Value</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-text-faint">Loading...</td></tr>
            : inventory.map(p => (
              <tr key={p.product_id}>
                <td><div className="font-500 text-text-primary">{p.name}</div><div className="text-xs font-mono text-text-faint">{p.sku}</div></td>
                <td>{p.category || '—'}</td>
                <td className="font-700"><span className={p.stock_quantity <= 0 ? 'text-danger' : p.stock_quantity <= p.reorder_level ? 'text-warning' : 'text-text-primary'}>{p.stock_quantity}</span></td>
                <td>{p.reorder_level}</td>
                <td>{formatCurrency(p.cost_price)}</td>
                <td className="text-primary font-600">{formatCurrency(p.stock_value)}</td>
                <td><span className={stockStatusColor(p.stock_status)}>{p.stock_status?.replace('_',' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Adjust Stock">
        <div className="space-y-4">
          <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Product *</label>
            <select className="k-input" value={form.product_id} onChange={e => setForm({...form,product_id:e.target.value})}>
              <option value="">Select product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} — Stock: {p.stock_quantity}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Movement Type *</label>
            <select className="k-input" value={form.movement_type} onChange={e => setForm({...form,movement_type:e.target.value})}>
              <option value="adjustment">Adjustment</option>
              <option value="purchase">Purchase</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
              <option value="return_in">Return In</option>
            </select>
          </div>
          <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Quantity *</label>
            <input type="number" className="k-input" placeholder="Enter quantity" value={form.quantity} onChange={e => setForm({...form,quantity:e.target.value})} />
          </div>
          <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Notes</label>
            <input type="text" className="k-input" placeholder="Optional notes" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => setShowModal(false)} className="k-btn-outline">Cancel</button>
            <button onClick={handleAdjust} className="k-btn-primary">Save Adjustment</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
