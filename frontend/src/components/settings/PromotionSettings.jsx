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
    discount_type: 'percentage',
    discount_value: '',
    applies_to: 'all',
    min_purchase: '',
    start_date: '',
    end_date: '',
    customer_ids: []
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const response = await settingService.getPromotions();
      setPromotions(response.data.promotions || []);
    } catch (err) {
      toast.error('Failed to load promotions.');
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

    try {
      let response;
      if (editingPromotion) {
        response = await settingService.updatePromotion(editingPromotion.promotion_id, form);
        toast.success('Promotion updated successfully.');
      } else {
        response = await settingService.createPromotion(form);
        toast.success('Promotion created successfully.');
      }
      setShowForm(false);
      setEditingPromotion(null);
      setForm({
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        applies_to: 'all',
        min_purchase: '',
        start_date: '',
        end_date: '',
        customer_ids: []
      });
      loadPromotions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save promotion.');
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setForm({
      name: promotion.name,
      description: promotion.description || '',
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      applies_to: promotion.applies_to,
      min_purchase: promotion.min_purchase || '',
      start_date: promotion.start_date ? promotion.start_date.split('T')[0] : '',
      end_date: promotion.end_date ? promotion.end_date.split('T')[0] : '',
      customer_ids: promotion.customer_ids || []
    });
    setShowForm(true);
  };

  const handleDelete = async (promotionId) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
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
            setForm({
              name: '',
              description: '',
              discount_type: 'percentage',
              discount_value: '',
              applies_to: 'all',
              min_purchase: '',
              start_date: '',
              end_date: '',
              customer_ids: []
            });
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
          <table className="k-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Period</th>
                <th>Customers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map(p => (
                <tr key={p.promotion_id}>
                  <td>
                    <div className="font-500 text-text-primary">{p.name}</div>
                    {p.description && <div className="text-xs text-text-muted">{p.description}</div>}
                  </td>
                  <td className="capitalize">{p.discount_type}</td>
                  <td className="font-600 text-primary">
                    {p.discount_type === 'percentage' ? `${p.discount_value}%` : formatCurrency(p.discount_value)}
                  </td>
                  <td className="text-xs">
                    {formatDateTime(p.start_date)}<br />
                    {formatDateTime(p.end_date)}
                  </td>
                  <td className="text-center">
                    {p.applies_to === 'all' ? (
                      <span className="text-xs text-success">All Customers</span>
                    ) : (
                      <span className="text-xs text-primary">{p.customer_count || 0} customers</span>
                    )}
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-success/10 text-success' : 'bg-text-faint/10 text-text-faint'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleStatus(p)} className="text-xs hover:underline text-text-muted">
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleEdit(p)} className="text-xs text-primary hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.promotion_id)} className="text-xs text-danger hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promotion Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
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
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Promotion Name <span className="text-danger"></span>
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="e.g., Weekend Sale"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Discount Type <span className="text-danger"></span>
                  </label>
                  <select
                    className="k-input"
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Discount Value <span className="text-danger"></span>
                  </label>
                  <input
                    type="number"
                    className="k-input"
                    placeholder={form.discount_type === 'percentage' ? 'e.g., 15' : 'e.g., 50'}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                    Start Date <span className="text-danger"></span>
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
                    End Date <span className="text-danger"></span>
                  </label>
                  <input
                    type="date"
                    className="k-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

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
              </div>

              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Applies To <span className="text-danger"></span>
                </label>
                <select
                  className="k-input"
                  value={form.applies_to}
                  onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                >
                  <option value="all">All Customers</option>
                  <option value="specific">Specific Customers</option>
                </select>
              </div>

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
                            <button onClick={() => removeCustomer(id)} className="hover:text-danger">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-surface-border">
                <button onClick={() => setShowForm(false)} className="k-btn-outline flex-1 py-3 text-sm">
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