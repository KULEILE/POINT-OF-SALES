import React, { useState, useEffect } from 'react';
import { supplierService } from '../services/supplierService';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSup,   setEditSup]   = useState(null);
  const [form, setForm] = useState({ name:'', contact_name:'', phone:'', email:'', address:'', payment_terms:30, notes:'' });

  const load = () => { setLoading(true); supplierService.getAll({ search }).then(r => setSuppliers(r.data.suppliers)).catch(() => toast.error('Failed to load suppliers')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditSup(null); setForm({ name:'', contact_name:'', phone:'', email:'', address:'', payment_terms:30, notes:'' }); setShowModal(true); };
  const openEdit   = (s) => { setEditSup(s); setForm({ name:s.name, contact_name:s.contact_name||'', phone:s.phone||'', email:s.email||'', address:s.address||'', payment_terms:s.payment_terms, notes:s.notes||'' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Supplier name is required'); return; }
    try {
      if (editSup) { await supplierService.update(editSup.supplier_id, form); toast.success('Supplier updated'); }
      else         { await supplierService.create(form); toast.success('Supplier created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save supplier'); }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg font-700 text-text-primary">Suppliers</h2><p className="text-sm text-text-muted">{suppliers.length} suppliers</p></div>
        <button onClick={openCreate} className="k-btn-primary">Add Supplier</button>
      </div>
      <div className="mb-4"><input className="k-input max-w-sm" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Payment Terms</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-text-faint">Loading...</td></tr>
            : suppliers.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-text-faint">No suppliers found</td></tr>
            : suppliers.map(s => (
              <tr key={s.supplier_id}>
                <td className="font-500 text-text-primary">{s.name}</td>
                <td>{s.contact_name || '—'}</td>
                <td>{s.phone || '—'}</td>
                <td>{s.email || '—'}</td>
                <td>{s.payment_terms} days</td>
                <td><button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editSup ? 'Edit Supplier' : 'Add Supplier'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[['name','Company Name ','text'],['contact_name','Contact Person','text'],['phone','Phone','tel'],['email','Email','email'],['payment_terms','Payment Terms (days)','number']].map(([k,l,t]) => (
              <div key={k}><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">{l}</label><input type={t} className="k-input" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
            ))}
          </div>
          <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Address</label><input type="text" className="k-input" value={form.address} onChange={e => setForm({...form,address:e.target.value})} /></div>
          <div className="flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="k-btn-outline">Cancel</button><button onClick={handleSave} className="k-btn-primary">{editSup ? 'Update' : 'Create'} Supplier</button></div>
        </div>
      </Modal>
    </div>
  );
};

export default Suppliers;
