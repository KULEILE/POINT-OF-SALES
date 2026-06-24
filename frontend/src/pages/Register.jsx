import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const Register = ({ onBack, onSuccess }) => {
  const [form, setForm] = useState({
    full_name: '',
    username:  '',
    email:     '',
    phone:     '',
    password:  '',
    role:      'admin',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    if (!form.username.trim())  { setError('Username is required.'); return; }
    if (form.username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (!form.password)         { setError('Password is required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!form.role)             { setError('Please select a role.'); return; }

    setLoading(true);
    try {
      await authService.register({
        full_name: form.full_name.trim(),
        username:  form.username.trim(),
        email:     form.email.trim() || null,
        phone:     form.phone.trim() || null,
        password:  form.password,
        role:      form.role,
      });
      toast.success('Account created successfully. Please sign in.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen bg-surface-bg flex">

      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-surface-card border-r border-surface-border flex-col justify-between p-10">
        <img
          src={logo}
          alt="K-POINT OF SALES"
          className=""
        />
        <div>
          <h2 className="text-3xl font-800 text-text-primary leading-tight mb-4 tracking-tight">
            Set up your<br/>
            <span className="text-primary">store</span> in<br/>
            minutes.
          </h2>
          <p className="text-sm text-text-muted leading-relaxed mb-8">
            Create the first admin account. You can add cashiers and managers from the dashboard after login.
          </p>
          <div className="flex flex-col gap-3">
            {[
              'First account becomes admin automatically',
              'Password stored as bcrypt hash — never plain',
              'Add unlimited staff from the dashboard',
              'Works offline with local PostgreSQL',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-text-muted">
                <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-faint">© 2025 K-POINT OF SALES · Maseru, Lesotho</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-panel overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          <button
            onClick={onBack}
            className="text-xs text-text-muted hover:text-primary mb-8 transition-colors"
          >
            ← Back
          </button>

          <h2 className="text-xl font-700 text-text-primary mb-1">Create account</h2>
          <p className="text-sm text-text-muted mb-8">Set up K-POINT OF SALES for your business</p>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full name + Username */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Full name *
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="Thabo Chale"
                  value={form.full_name}
                  onChange={set('full_name')}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="thabo.chale"
                  value={form.username}
                  onChange={set('username')}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                type="email"
                className="k-input"
                placeholder="you@store.co.ls"
                value={form.email}
                onChange={set('email')}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Phone number
              </label>
              <input
                type="tel"
                className="k-input"
                placeholder="+266 5000 0000"
                value={form.phone}
                onChange={set('phone')}
              />
            </div>

            {/* Password + Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="k-input pr-14"
                    placeholder="Min 6 chars"
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-faint hover:text-text-muted transition-colors"
                  >
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Role *
                </label>
                <select
                  className="k-input"
                  value={form.role}
                  onChange={set('role')}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`k-btn-primary w-full py-3.5 mt-2 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

          </form>

          <p className="text-center text-xs text-text-faint mt-8">
            K-POINT OF SALES <span className="text-primary">v1.0</span>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Register;
