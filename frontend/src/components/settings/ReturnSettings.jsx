import React, { useState, useEffect } from 'react';
import { settingService } from '../../services/settingService';
import toast from 'react-hot-toast';

const ReturnSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    return_window_days: 30,
    require_receipt: true,
    no_receipt_action: 'store_credit',
    restocking_fee_percentage: 0,
    manager_approval_threshold: 500,
    max_returns_per_customer: 5,
    allow_opened_items: false,
    allow_used_items: false,
    require_condition_check: true,
    allow_cash_refund: true,
    allow_card_refund: true,
    allow_mobile_refund: true,
    allow_store_credit: true,
    default_refund_method: 'cash',
    notify_manager: true,
    high_value_notification: 500,
    email_report: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await settingService.getReturnSettings();
      if (response.data.success && response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      toast.error('Failed to load return settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await settingService.updateReturnSettings(settings);
      if (response.data.success) {
        toast.success('Return settings saved successfully.');
        setSettings(response.data.settings);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save return settings.');
    } finally {
      setSaving(false);
    }
  };

  const noReceiptOptions = [
    { value: 'store_credit', label: 'Store Credit Only' },
    { value: 'no_return', label: 'No Return' },
    { value: 'manager_approval', label: 'Manager Approval Required' }
  ];

  const refundMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'mobile', label: 'Mobile Money' },
    { value: 'store_credit', label: 'Store Credit' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Return Policy */}
      <div className="k-card">
        <h3 className="text-sm font-700 text-text-primary mb-4">Return Policy</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Return Window (days)
              </label>
              <select
                className="k-input"
                value={settings.return_window_days}
                onChange={(e) => handleChange('return_window_days', parseInt(e.target.value))}
              >
                <option value="0">No Returns Allowed</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
                <option value="45">45 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Manager Approval Threshold (M)
              </label>
              <select
                className="k-input"
                value={settings.manager_approval_threshold}
                onChange={(e) => handleChange('manager_approval_threshold', parseFloat(e.target.value))}
              >
                <option value="0">No Approval Required</option>
                <option value="100">M 100</option>
                <option value="200">M 200</option>
                <option value="500">M 500</option>
                <option value="1000">M 1000</option>
                <option value="2000">M 2000</option>
                <option value="5000">M 5000</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Require Receipt
              </label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    checked={settings.require_receipt === true}
                    onChange={() => handleChange('require_receipt', true)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    checked={settings.require_receipt === false}
                    onChange={() => handleChange('require_receipt', false)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  No
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Return Without Receipt
              </label>
              <select
                className="k-input"
                value={settings.no_receipt_action}
                onChange={(e) => handleChange('no_receipt_action', e.target.value)}
              >
                {noReceiptOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Restocking Fee (%)
              </label>
              <input
                type="number"
                className="k-input"
                min="0"
                max="50"
                step="0.5"
                value={settings.restocking_fee_percentage}
                onChange={(e) => handleChange('restocking_fee_percentage', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                Max Returns Per Customer (per month)
              </label>
              <select
                className="k-input"
                value={settings.max_returns_per_customer}
                onChange={(e) => handleChange('max_returns_per_customer', parseInt(e.target.value))}
              >
                <option value="0">Unlimited</option>
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Item Condition */}
      <div className="k-card">
        <h3 className="text-sm font-700 text-text-primary mb-4">Item Condition</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_opened_items}
                onChange={(e) => handleChange('allow_opened_items', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Allow Opened Items
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_used_items}
                onChange={(e) => handleChange('allow_used_items', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Allow Used Items
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_condition_check}
                onChange={(e) => handleChange('require_condition_check', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Require Condition Check
            </label>
          </div>
        </div>
      </div>

      {/* Refund Methods */}
      <div className="k-card">
        <h3 className="text-sm font-700 text-text-primary mb-4">Refund Methods</h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_cash_refund}
                onChange={(e) => handleChange('allow_cash_refund', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Allow Cash Refund
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_card_refund}
                onChange={(e) => handleChange('allow_card_refund', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Allow Card Refund
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_mobile_refund}
                onChange={(e) => handleChange('allow_mobile_refund', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Allow Mobile Refund
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_store_credit}
                onChange={(e) => handleChange('allow_store_credit', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Allow Store Credit
            </label>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
              Default Refund Method
            </label>
            <select
              className="k-input max-w-xs"
              value={settings.default_refund_method}
              onChange={(e) => handleChange('default_refund_method', e.target.value)}
            >
              {refundMethodOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="k-card">
        <h3 className="text-sm font-700 text-text-primary mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notify_manager}
                onChange={(e) => handleChange('notify_manager', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Notify Manager on Return
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_report}
                onChange={(e) => handleChange('email_report', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Send Daily Email Report
            </label>
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
              High Value Notification Threshold (M)
            </label>
            <select
              className="k-input max-w-xs"
              value={settings.high_value_notification}
              onChange={(e) => handleChange('high_value_notification', parseFloat(e.target.value))}
            >
              <option value="0">No Notification</option>
              <option value="100">M 100</option>
              <option value="200">M 200</option>
              <option value="500">M 500</option>
              <option value="1000">M 1000</option>
              <option value="2000">M 2000</option>
              <option value="5000">M 5000</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`k-btn-primary px-8 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saving ? 'Saving...' : 'Save Return Settings'}
        </button>
      </div>
    </div>
  );
};

export default ReturnSettings;