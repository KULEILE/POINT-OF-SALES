import React, { useState, useEffect } from 'react';
import { settingService } from '../../services/settingService';
import { customerService } from '../../services/customerService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const PromotionSettings = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    promotion_type: 'percentage',
    discount_value: '',
    applies_to: 'all',
    min_purchase: '',
    start_date: '',
    end_date: '',
    customer_ids: [],
    min_quantity: 1,
    priority: 0,
    applies_to_wholesale: true,
    applies_to_retail: true
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const response = await settingService.getPromotions();
      const promotionsData = response.data.promotions || [];
      
      // For each promotion, fetch its customer IDs
      const promotionsWithCustomers = await Promise.all(
        promotionsData.map(async (promo) => {
          try {
            const detailResponse = await settingService.getPromotionById(promo.promotion_id);
            return {
              ...promo,
              customer_ids: detailResponse.data.customers || []
            };
          } catch (err) {
            return {
              ...promo,
              customer_ids: []
            };
          }
        })
      );
      
      setPromotions(promotionsWithCustomers);
    } catch (err) {
      toast.error('Failed to load promotions.');
      console.error('[PromotionSettings] loadPromotions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    if (!query || query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const response = await customerService.getAll({ search: query, limit: 10 });
      setCustomerSearchResults(response.data.customers || []);
    } catch (err) {
      console.error('Failed to search customers:', err);
    }
  };

  const addCustomer = (customer) => {
    if (form.customer_ids.includes(customer.customer_id)) {
      toast.info('Customer already added.');
      return;
    }
    setForm({
      ...form,
      customer_ids: [...form.customer_ids, customer.customer_id]
    });
    setCustomerSearchResults([]);
    setSearchCustomer('');
    toast.success(`${customer.full_name} added.`);
  };

  const removeCustomer = (customerId) => {
    setForm({
      ...form,
      customer_ids: form.customer_ids.filter(id => id !== customerId)
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.discount_value || !form.start_date || !form.end_date) {
      toast.error('Name, discount value, start date and end date are required.');
      return;
    }

    if (new Date(form.start_date) > new Date(form.end_date)) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      promotion_type: form.promotion_type,
      discount_value: parseFloat(form.discount_value),
      applies_to: form.applies_to,
      min_purchase: parseFloat(form.min_purchase) || 0,
      start_date: form.start_date,
      end_date: form.end_date,
      customer_ids: form.applies_to === 'specific' ? form.customer_ids : [],
      min_quantity: parseInt(form.min_quantity) || 1,
      priority: parseInt(form.priority) || 0,
      applies_to_wholesale: form.applies_to_wholesale,
      applies_to_retail: form.applies_to_retail
    };

    try {
      let response;
      if (editingPromotion) {
        response = await settingService.updatePromotion(editingPromotion.promotion_id, payload);
        toast.success('Promotion updated successfully.');
      } else {
        response = await settingService.createPromotion(payload);
        toast.success('Promotion created successfully.');
      }
      setShowForm(false);
      setEditingPromotion(null);
      resetForm();
      loadPromotions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save promotion.');
      console.error('[PromotionSettings] handleSave error:', err);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      promotion_type: 'percentage',
      discount_value: '',
      applies_to: 'all',
      min_purchase: '',
      start_date: '',
      end_date: '',
      customer_ids: [],
      min_quantity: 1,
      priority: 0,
      applies_to_wholesale: true,
      applies_to_retail: true
    });
    setCustomerSearchResults([]);
    setSearchCustomer('');
  };

  const handleEdit = async (promotion) => {
    setEditingPromotion(promotion);
    
    // Fetch customer IDs for this promotion
    let customerIds = promotion.customer_ids || [];
    if (!customerIds.length) {
      try {
        const detailResponse = await settingService.getPromotionById(promotion.promotion_id);
        customerIds = detailResponse.data.customers || [];
      } catch (err) {
        console.error('Failed to fetch promotion customers:', err);
      }
    }
    
    setForm({
      name: promotion.name,
      description: promotion.description || '',
      promotion_type: promotion.promotion_type || 'percentage',
      discount_value: promotion.discount_value,
      applies_to: promotion.applies_to || 'all',
      min_purchase: promotion.min_purchase || '',
      start_date: promotion.start_date ? promotion.start_date.split('T')[0] : '',
      end_date: promotion.end_date ? promotion.end_date.split('T')[0] : '',
      customer_ids: customerIds,
      min_quantity: promotion.min_quantity || 1,
      priority: promotion.priority || 0,
      applies_to_wholesale: promotion.applies_to_wholesale !== undefined ? promotion.applies_to_wholesale : true,
      applies_to_retail: promotion.applies_to_retail !== undefined ? promotion.applies_to_retail : true
    });
    setShowForm(true);
  };

  const handleDelete = async (promotionId) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    try {
      await settingService.deletePromotion(promotionId);
      toast.success('Promotion deleted.');
      loadPromotions();
    } catch (err) {
      toast.error('Failed to delete promotion.');
    }
  };

  const handleToggleStatus = async (promotion) => {
    try {
      await settingService.updatePromotion(promotion.promotion_id, {
        ...promotion,
        is_active: !promotion.is_active
      });
      toast.success(`Promotion ${promotion.is_active ? 'deactivated' : 'activated'}.`);
      loadPromotions();
    } catch (err) {
      toast.error('Failed to update promotion status.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-700 text-text-primary">Active Promotions</h3>
          <p className="text-xs text-text-muted">Promotions are automatically applied to eligible sales</p>
        </div>
        <button
          onClick={() => {
            setEditingPromotion(null);
            resetForm();
            setShowForm(true);
          }}
          className="k-btn-primary text-sm px-4 py-2"
        >
          Add Promotion
        </button>
      </div>

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-surface-bg border border-surface-border rounded-xl p-8 text-center text-text-muted">
          <p>No promotions configured</p>
          <p className="text-xs mt-1">Add a promotion to offer discounts to customers</p>
        </div>
      ) : (
        <div className="k-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="k-table w-full">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Value</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Min Purchase</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Period</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Customers</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map(p => (
                  <tr key={p.promotion_id} className="border-t border-surface-border">
                    <td className="py-3 px-4">
                      <div className="font-500 text-text-primary">{p.name}</div>
                      {p.description && <div className="text-xs text-text-muted">{p.description}</div>}
                    </td>
                    <td className="py-3 px-4 capitalize text-xs">{p.promotion_type || 'percentage'}</td>
                    <td className="py-3 px-4 font-600 text-primary text-sm">
                      {p.promotion_type === 'percentage' ? `${p.discount_value}%` : formatCurrency(p.discount_value)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {parseFloat(p.min_purchase) > 0 ? formatCurrency(p.min_purchase) : 'No minimum'}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div>{formatDateTime(p.start_date)}</div>
                      <div className="text-text-faint text-[10px]">to</div>
                      <div>{formatDateTime(p.end_date)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.applies_to === 'all' ? (
                        <span className="text-xs text-success">All Customers</span>
                      ) : (
                        <span className="text-xs text-primary">{p.customer_count || 0} customers</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-success/10 text-success' : 'bg-text-faint/10 text-text-faint'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button 
                          onClick={() => handleToggleStatus(p)} 
                          className="text-xs hover:underline text-text-muted"
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleEdit(p)} 
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(p.promotion_id)} 
                          className="text-xs text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Promotion Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-surface-border sticky top-0 bg-surface-card z-10">
              <h2 className="text-base font-700 text-text-primary">
                {editingPromotion ? 'Edit Promotion' : 'Add Promotion'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Promotion Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="e.g., Weekend Sale"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="Brief description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Discount Type <span className="text-danger">*</span>
                  </label>
                  <select
                    className="k-input"
                    value={form.promotion_type}
                    onChange={(e) => setForm({ ...form, promotion_type: e.target.value })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Discount Value <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="k-input"
                    placeholder={form.promotion_type === 'percentage' ? 'e.g., 15' : 'e.g., 50'}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="k-input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="k-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Minimum Purchase */}
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Minimum Purchase
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="0 (no minimum)"
                  value={form.min_purchase}
                  onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-text-faint mt-1">Cart subtotal must reach this amount for promotion to apply</p>
              </div>

              {/* Minimum Quantity */}
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="1"
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                />
                <p className="text-xs text-text-faint mt-1">Minimum quantity of any single item required</p>
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Applies To <span className="text-danger">*</span>
                </label>
                <select
                  className="k-input"
                  value={form.applies_to}
                  onChange={(e) => {
                    setForm({ 
                      ...form, 
                      applies_to: e.target.value,
                      customer_ids: e.target.value === 'all' ? [] : form.customer_ids
                    });
                  }}
                >
                  <option value="all">All Customers</option>
                  <option value="specific">Specific Customers</option>
                </select>
              </div>

              {/* Customer Selection */}
              {form.applies_to === 'specific' && (
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Select Customers
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="k-input flex-1"
                      placeholder="Search by name or phone..."
                      value={searchCustomer}
                      onChange={(e) => {
                        setSearchCustomer(e.target.value);
                        searchCustomers(e.target.value);
                      }}
                    />
                  </div>
                  {customerSearchResults.length > 0 && (
                    <div className="bg-surface-bg border border-surface-border rounded-lg max-h-32 overflow-y-auto">
                      {customerSearchResults.map(c => (
                        <button
                          key={c.customer_id}
                          onClick={() => addCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-panel border-b border-surface-border last:border-0 text-sm"
                        >
                          {c.full_name} {c.phone && `(${c.phone})`}
                        </button>
                      ))}
                    </div>
                  )}
                  {form.customer_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.customer_ids.map(id => {
                        const customer = customerSearchResults.find(c => c.customer_id === id);
                        return (
                          <span key={id} className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                            {customer?.full_name || id}
                            <button 
                              onClick={() => removeCustomer(id)} 
                              className="hover:text-danger ml-1"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-text-faint mt-1">Selected customers will be eligible for this promotion</p>
                </div>
              )}

              {/* Wholesale/Retail toggle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    <input
                      type="checkbox"
                      checked={form.applies_to_retail}
                      onChange={(e) => setForm({ ...form, applies_to_retail: e.target.checked })}
                      className="mr-2"
                    />
                    Applies to Retail
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    <input
                      type="checkbox"
                      checked={form.applies_to_wholesale}
                      onChange={(e) => setForm({ ...form, applies_to_wholesale: e.target.checked })}
                      className="mr-2"
                    />
                    Applies to Wholesale
                  </label>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="0"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <p className="text-xs text-text-faint mt-1">Higher priority promotions are applied first</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-surface-border">
                <button 
                  onClick={() => setShowForm(false)} 
                  className="k-btn-outline flex-1 py-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="k-btn-primary flex-1 py-3 text-sm"
                >
                  {editingPromotion ? 'Update Promotion' : 'Save Promotion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionSettings;