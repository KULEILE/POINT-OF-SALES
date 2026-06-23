import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const Register = ({ onBack, onSuccess }) => {
  const [form, setForm]       = useState({ full_name: '', username: '', email: '', phone: '', password: '', role: 'admin' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.username || !form.password) { setError('Full name, username and password are required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await authService.register(form);
      toast.success('Account created successfully.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg flex">
      <div className="hidden lg:flex w-5/12 bg-surface-card border-r border-surface-border flex-col justify-between p-10">
        <img src={logo} alt="K-POINT OF SALES" className="h-10 object-contain bg-white rounded-lg px-3 py-1 self-start" />
        <div>
          <h2 className="text-3xl font-800 text-text-primary leading-tight mb-4 tracking-tight">Set up your<br/><span className="text-primary">store</span> in<br/>minutes.</h2>
          <p className="text-sm text-text-muted leading-relaxed mb-8">Create the first admin account. You can add cashiers and managers from the dashboard after login.</p>
          <div className="flex flex-col gap-3">
            {['First account becomes admin automatically','Password stored as bcrypt hash — never plain','Add unlimited staff from the dashboard','Works offline with local PostgreSQL'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-text-muted">
                <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-faint">© 2025 K-POINT OF SALES · Maseru, Lesotho</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-surface-panel overflow-y-auto">
        <div className="w-full max-w-sm">
          <button onClick={onBack} className="text-xs text-text-muted hover:text-primary mb-8 transition-colors">← Back</button>
          <h2 className="text-xl font-700 text-text-primary mb-1">Create account</h2>
          <p className="text-sm text-text-muted mb-8">Set up K-POINT OF SALES for your business</p>

          {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Full name</label>
                <input type="text" className="k-input" placeholder="Thabo Chale" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Username</label>
                <input type="text" className="k-input" placeholder="thabo.chale" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" className="k-input" placeholder="you@store.co.ls" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="k-input pr-14" placeholder="Min 6 chars" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-faint hover:text-text-muted">{showPwd ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Role</label>
                <select className="k-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className={`k-btn-primary w-full py-3.5 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-xs text-text-faint mt-8">K-POINT OF SALES <span className="text-primary">v1.0</span></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
