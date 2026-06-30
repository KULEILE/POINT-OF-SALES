import api from './api';

export const settingService = {
  getWholesaleSettings: () => api.get('/settings/wholesale'),
  updateWholesaleSettings: (data) => api.put('/settings/wholesale', data),
  getDiscountTiers: () => api.get('/settings/discount-tiers'),
  updateDiscountTiers: (data) => api.put('/settings/discount-tiers', data),
};