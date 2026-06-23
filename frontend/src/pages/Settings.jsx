import React, { useState } from 'react';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const [pwdForm, setPwdForm] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [loading,  setLoading]  = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) { toast.error('New passwords do not match'); return; }
    if (pwdForm.new_password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await userService.changePassword({ current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      toast.success('Password changed successfully');
      setPwdForm({ current_password:'', new_password:'', confirm_password:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6"><h2 className="text-lg font-700 text-text-primary">Settings</h2><p className="text-sm text-text-muted">Account and system preferences</p></div>
      <div className="max-w-lg space-y-6">
        <div className="k-card">
          <h3 className="text-sm font-700 text-text-primary mb-4">Your Account</h3>
          <div className="space-y-2">
            {[['Full Name', user?.full_name],['Username', user?.username],['Email', user?.email || '—'],['Role', user?.role]].map(([l,v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-surface-border last:border-0">
                <span className="text-sm text-text-muted">{l}</span>
                <span className="text-sm font-500 text-text-primary capitalize">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="k-card">
          <h3 className="text-sm font-700 text-text-primary mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[['current_password','Current Password'],['new_password','New Password'],['confirm_password','Confirm New Password']].map(([k,l]) => (
              <div key={k}><label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">{l}</label><input type="password" className="k-input" value={pwdForm[k]} onChange={e => setPwdForm({...pwdForm,[k]:e.target.value})} /></div>
            ))}
            <button type="submit" disabled={loading} className={`k-btn-primary ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>{loading ? 'Changing...' : 'Change Password'}</button>
          </form>
        </div>

        <div className="k-card">
          <h3 className="text-sm font-700 text-text-primary mb-2">System Info</h3>
          <div className="space-y-2">
            {[['Version','K-POINT OF SALES v1.0'],['Database','PostgreSQL'],['Location','Maseru, Lesotho'],['Currency','LSL (M)'],['Default Tax Rate','15% VAT']].map(([l,v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-surface-border last:border-0">
                <span className="text-sm text-text-muted">{l}</span>
                <span className="text-sm font-500 text-primary">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
