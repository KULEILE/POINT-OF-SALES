import api from './api';

const promotionService = {
  getActivePromotions: async (customerId = null) => {
    const params = customerId ? { customer_id: customerId } : {};
    const response = await api.get('/settings/promotions/active', { params });
    return response.data;
  },

  calculateCartPromotion: async (cartData) => {
    const response = await api.post('/settings/promotions/calculate', cartData);
    return response.data;
  },

  checkProductPromotions: async (productId) => {
    const response = await api.get(`/settings/promotions/product/${productId}`);
    return response.data;
  },

  getPromotionById: async (promotionId) => {
    const response = await api.get(`/settings/promotions/${promotionId}`);
    return response.data;
  },

  createPromotion: async (promotionData) => {
    const response = await api.post('/settings/promotions', promotionData);
    return response.data;
  },

  updatePromotion: async (promotionId, promotionData) => {
    const response = await api.put(`/settings/promotions/${promotionId}`, promotionData);
    return response.data;
  },

  deletePromotion: async (promotionId) => {
    const response = await api.delete(`/settings/promotions/${promotionId}`);
    return response.data;
  },

  formatPromotionDescription: (promotion) => {
    if (!promotion) return '';
    
    if (promotion.promotion_type === 'percentage') {
      return `${promotion.discount_value}% OFF`;
    } else if (promotion.promotion_type === 'fixed') {
      return `M ${parseFloat(promotion.discount_value).toFixed(2)} OFF`;
    }
    return promotion.name || 'Promotion';
  },

  getPromotionColor: (promotion) => {
    if (!promotion) return 'text-text-muted';
    
    if (promotion.promotion_type === 'percentage') {
      return 'text-success bg-success/10';
    } else if (promotion.promotion_type === 'fixed') {
      return 'text-primary bg-primary/10';
    }
    return 'text-accent bg-accent/10';
  }
};

export { promotionService };