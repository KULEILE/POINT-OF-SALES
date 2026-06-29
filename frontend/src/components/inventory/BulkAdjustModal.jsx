import React, { useState } from 'react';
import { inventoryService } from '../../services/inventoryService';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';

const BulkAdjustModal = ({ open, onClose, products, onSuccess }) => {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [movementType, setMovementType] = useState('adjustment');
  const [notes, setNotes] = useState('');

  const addAdjustment = () => {
    if (!selectedProduct || !quantity) {
      toast.error('Please select a product and enter a quantity.');
      return;
    }

    const product = products.find(p => p.product_id === parseInt(selectedProduct));
    if (!product) {
      toast.error('Product not found.');
      return;
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      toast.error('Quantity must be greater than zero.');
      return;
    }

    // Check if product is already in the list
    if (adjustments.some(a => a.product_id === parseInt(selectedProduct))) {
      toast.error('This product is already in the adjustment list.');
      return;
    }

    setAdjustments([
      ...adjustments,
      {
        product_id: parseInt(selectedProduct),
        product_name: product.name,
        movement_type: movementType,
        quantity: qty,
        notes: notes || `${movementType} adjustment`
      }
    ]);

    // Reset form
    setSelectedProduct('');
    setQuantity('');
    setNotes('');
    toast.success(`${product.name} added to adjustment list.`);
  };

  const removeAdjustment = (index) => {
    const newAdjustments = adjustments.filter((_, i) => i !== index);
    setAdjustments(newAdjustments);
  };

  const handleSubmit = async () => {
    if (adjustments.length === 0) {
      toast.error('Please add at least one product to adjust.');
      return;
    }

    setLoading(true);
    try {
      const response = await inventoryService.bulkAdjust({ adjustments });
      toast.success(response.data.message || 'Bulk adjustment completed successfully.');
      setAdjustments([]);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process bulk adjustment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Stock Adjustment" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Add multiple products to adjust stock in one go. This is useful for taking inventory or updating stock for many items.
        </p>

        {/* Add adjustment form */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-surface-bg rounded-xl">
          <div>
            <label className="block text-xs font-500 text-text-muted mb-1">Product *</label>
            <select 
              className="k-input text-sm" 
              value={selectedProduct} 
              onChange={e => setSelectedProduct(e.target.value)}
            >
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} (Stock: {p.stock_quantity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted mb-1">Type *</label>
            <select 
              className="k-input text-sm" 
              value={movementType} 
              onChange={e => setMovementType(e.target.value)}
            >
              <option value="adjustment">Adjustment</option>
              <option value="purchase">Purchase (Add)</option>
              <option value="damaged">Damaged (Remove)</option>
              <option value="lost">Lost (Remove)</option>
              <option value="return_in">Return In</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted mb-1">Quantity *</label>
            <input 
              type="number" 
              className="k-input text-sm" 
              placeholder="Qty" 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button onClick={addAdjustment} className="k-btn-primary w-full text-sm">Add to List</button>
          </div>
        </div>

        {/* Adjustment list */}
        {adjustments.length > 0 && (
          <div>
            <p className="text-sm font-600 text-text-primary mb-2">{adjustments.length} product(s) to adjust</p>
            <div className="max-h-60 overflow-y-auto border border-surface-border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-surface-bg">
                  <tr>
                    <th className="px-3 py-2 text-left text-text-muted">Product</th>
                    <th className="px-3 py-2 text-left text-text-muted">Type</th>
                    <th className="px-3 py-2 text-right text-text-muted">Qty</th>
                    <th className="px-3 py-2 text-right text-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj, index) => (
                    <tr key={index} className="border-t border-surface-border">
                      <td className="px-3 py-2 font-500">{adj.product_name}</td>
                      <td className="px-3 py-2 capitalize">{adj.movement_type}</td>
                      <td className="px-3 py-2 text-right">{adj.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <button 
                          onClick={() => removeAdjustment(index)} 
                          className="text-danger hover:underline text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="k-btn-outline">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={loading || adjustments.length === 0}
            className={`k-btn-primary ${(loading || adjustments.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : `Apply Adjustments (${adjustments.length})`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkAdjustModal;