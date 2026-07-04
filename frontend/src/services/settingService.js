import api from './api';

export const settingService = {
  // Wholesale settings
  getWholesaleSettings: () => api.get('/settings/wholesale'),
  updateWholesaleSettings: (data) => api.put('/settings/wholesale', data),

  // Discount tiers
  getDiscountTiers: () => api.get('/settings/discount-tiers'),
  updateDiscountTiers: (data) => api.put('/settings/discount-tiers', data),

  // Return settings
  getReturnSettings: () => api.get('/settings/return'),
  updateReturnSettings: (data) => api.put('/settings/return', data),

  // Promotions
  getPromotions: () => api.get('/settings/promotions'),
  getPromotionById: (id) => api.get(`/settings/promotions/${id}`),
  createPromotion: (data) => api.post('/settings/promotions', data),
  updatePromotion: (id, data) => api.put(`/settings/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/settings/promotions/${id}`),
};