import React, { useState } from 'react';
import { inventoryService } from '../../services/inventoryService';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';

const StockTransferModal = ({ open, onClose, products, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    from_location: '',
    to_location: '',
    quantity: '',
    notes: ''
  });

  const locations = ['Main Store', 'Branch 1', 'Branch 2', 'Warehouse'];

  const handleSubmit = async () => {
    if (!form.product_id) {
      toast.error('Please select a product.');
      return;
    }
    if (!form.from_location || !form.to_location) {
      toast.error('Please select both from and to locations.');
      return;
    }
    if (form.from_location === form.to_location) {
      toast.error('From location and to location cannot be the same.');
      return;
    }
    if (!form.quantity || parseFloat(form.quantity) <= 0) {
      toast.error('Please enter a valid quantity greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const response = await inventoryService.transferStock(form);
      toast.success(response.data.message || 'Stock transferred successfully.');
      setForm({ product_id: '', from_location: '', to_location: '', quantity: '', notes: '' });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Transfer Stock Between Locations" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Transfer stock from one location to another. This is useful when moving inventory between branches or stores.
        </p>

        <div>
          <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Product *</label>
          <select 
            className="k-input" 
            value={form.product_id} 
            onChange={e => setForm({...form, product_id: e.target.value})}
          >
            <option value="">Select product</option>
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.name} (Stock: {p.stock_quantity})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">From Location *</label>
            <select 
              className="k-input" 
              value={form.from_location} 
              onChange={e => setForm({...form, from_location: e.target.value})}
            >
              <option value="">Select location</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">To Location *</label>
            <select 
              className="k-input" 
              value={form.to_location} 
              onChange={e => setForm({...form, to_location: e.target.value})}
            >
              <option value="">Select location</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Quantity to Transfer *</label>
          <input 
            type="number" 
            className="k-input" 
            placeholder="Enter quantity" 
            value={form.quantity} 
            onChange={e => setForm({...form, quantity: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Notes</label>
          <input 
            type="text" 
            className="k-input" 
            placeholder="Reason for transfer (optional)" 
            value={form.notes} 
            onChange={e => setForm({...form, notes: e.target.value})}
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="k-btn-outline">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className={`k-btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : 'Transfer Stock'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StockTransferModal;