import React, { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/common/Modal';
import SettlementModal from '../components/payments/SettlementModal';
import toast from 'react-hot-toast';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCust, setEditCust] = useState(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementCustomer, setSettlementCustomer] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    district: '',
    customer_type: 'walk_in',
    credit_limit: 0
  });

  const load = () => {
    setLoading(true);
    customerService.getAll({ search })
      .then(r => setCustomers(r.data.customers))
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search]);

  const openCreate = () => {
    setEditCust(null);
    setForm({
      full_name: '',
      phone: '',
      email: '',
      address: '',
      district: '',
      customer_type: 'walk_in',
      credit_limit: 0
    });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditCust(c);
    setForm({
      full_name: c.full_name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      district: c.district || '',
      customer_type: c.customer_type,
      credit_limit: c.credit_limit
    });
    setShowModal(true);
  };

  const openSettlement = (customer) => {
    setSettlementCustomer(customer);
    setShowSettlement(true);
  };

  const handleSave = async () => {
    if (!form.full_name) {
      toast.error('Full name is required');
      return;
    }
    try {
      if (editCust) {
        await customerService.update(editCust.customer_id, form);
        toast.success('Customer updated');
      } else {
        await customerService.create(form);
        toast.success('Customer created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    }
  };

  const handleSettlementSuccess = () => {
    setShowSettlement(false);
    setSettlementCustomer(null);
    load();
    toast.success('Settlement completed successfully.');
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-700 text-text-primary">Customers</h2>
          <p className="text-sm text-text-muted">{customers.length} customers</p>
        </div>
        <button onClick={openCreate} className="k-btn-primary">Add Customer</button>
      </div>

      <div className="mb-4">
        <input
          className="k-input max-w-sm"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Total Purchases</th>
              <th>Last Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-text-faint">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-text-faint">No customers found</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.customer_id}>
                  <td className="font-500 text-text-primary">{c.full_name}</td>
                  <td>{c.phone || '—'}</td>
                  <td><span className="k-badge-cyan capitalize">{c.customer_type?.replace('_', ' ')}</span></td>
                  <td className={parseFloat(c.current_balance) > 0 ? 'text-warning font-600' : 'text-text-muted'}>
                    {formatCurrency(c.current_balance)}
                  </td>
                  <td>{formatCurrency(c.total_purchases)}</td>
                  <td>{c.last_visit ? formatDate(c.last_visit) : '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs text-primary hover:underline">
                        Edit
                      </button>
                      {parseFloat(c.current_balance) > 0 && (
                        <button onClick={() => openSettlement(c)} className="text-xs text-warning hover:underline">
                          Settle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editCust ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                className="k-input"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Phone</label>
              <input
                type="tel"
                className="k-input"
                placeholder="+266 5000 0000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                className="k-input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">District</label>
              <input
                type="text"
                className="k-input"
                placeholder="Maseru"
                value={form.district}
                onChange={e => setForm({ ...form, district: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Type</label>
              <select
                className="k-input"
                value={form.customer_type}
                onChange={e => setForm({ ...form, customer_type: e.target.value })}
              >
                <option value="walk_in">Walk-in</option>
                <option value="registered">Registered</option>
                <option value="credit">Credit</option>
                <option value="layby">Lay-by</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Credit Limit</label>
              <input
                type="number"
                className="k-input"
                value={form.credit_limit}
                onChange={e => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Address</label>
            <input
              type="text"
              className="k-input"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="k-btn-outline">Cancel</button>
            <button onClick={handleSave} className="k-btn-primary">{editCust ? 'Update' : 'Create'} Customer</button>
          </div>
        </div>
      </Modal>

      {showSettlement && settlementCustomer && (
        <SettlementModal
          customer={settlementCustomer}
          onClose={() => {
            setShowSettlement(false);
            setSettlementCustomer(null);
          }}
          onSuccess={handleSettlementSuccess}
        />
      )}
    </div>
  );
};

export default Customers;