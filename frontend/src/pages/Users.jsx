import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { formatDateTime, roleColor, statusColor } from '../utils/formatters';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const Users = () => {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser,  setEditUser]  = useState(null);
  const [form, setForm] = useState({ full_name:'', username:'', email:'', phone:'', password:'', role:'cashier' });

  const load = () => { setLoading(true); userService.getAll().then(r => setUsers(r.data.users)).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditUser(null); setForm({ full_name:'', username:'', email:'', phone:'', password:'', role:'cashier' }); setShowModal(true); };
  const openEdit   = (u) => { setEditUser(u); setForm({ full_name:u.full_name, username:u.username, email:u.email||'', phone:u.phone||'', password:'', role:u.role }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editUser) { await userService.update(editUser.user_id, { full_name:form.full_name, email:form.email, phone:form.phone, role:form.role }); toast.success('User updated'); }
      else          { await authService.register(form); toast.success('User created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save user'); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try { await userService.deactivate(id); toast.success('User deactivated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg font-700 text-text-primary">User Management</h2><p className="text-sm text-text-muted">{users.length} users</p></div>
        <button onClick={openCreate} className="k-btn-primary">Add User</button>
      </div>
      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last Login</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-text-faint">Loading...</td></tr>
            : users.map(u => (
              <tr key={u.user_id}>
                <td className="font-500 text-text-primary">{u.full_name}</td>
                <td className="font-mono text-xs">{u.username}</td>
                <td><span className={roleColor(u.role)}>{u.role}</span></td>
                <td><span className={statusColor(u.status)}>{u.status}</span></td>
                <td>{u.last_login ? formatDateTime(u.last_login) : 'Never'}</td>
                <td className="flex gap-2">
                  <button onClick={() => openEdit(u)} className="text-xs text-primary hover:underline">Edit</button>
                  {u.status === 'active' && <button onClick={() => handleDeactivate(u.user_id)} className="text-xs text-danger hover:underline">Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Full Name *</label><input type="text" className="k-input" value={form.full_name} onChange={e => setForm({...form,full_name:e.target.value})} /></div>
            <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Username *</label><input type="text" className="k-input" value={form.username} onChange={e => setForm({...form,username:e.target.value})} disabled={!!editUser} /></div>
            <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Email</label><input type="email" className="k-input" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
            <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Phone</label><input type="tel" className="k-input" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></div>
            {!editUser && <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Password *</label><input type="password" className="k-input" value={form.password} onChange={e => setForm({...form,password:e.target.value})} /></div>}
            <div><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Role *</label>
              <select className="k-input" value={form.role} onChange={e => setForm({...form,role:e.target.value})}>
                <option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option><option value="auditor">Auditor</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="k-btn-outline">Cancel</button><button onClick={handleSave} className="k-btn-primary">{editUser ? 'Update' : 'Create'} User</button></div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
