import api from './api';

export const promotionService = {
  getActivePromotions: async (customerId = null, isWholesale = false) => {
    try {
      const params = {};
      if (customerId) params.customer_id = customerId;
      if (isWholesale) params.is_wholesale = true;
      
      console.log('[promotionService] getActivePromotions called with params:', params);
      
      const response = await api.get('/settings/promotions/active', { params });
      
      console.log('[promotionService] getActivePromotions response status:', response.status);
      console.log('[promotionService] getActivePromotions response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[promotionService] getActivePromotions ERROR:', error);
      console.error('[promotionService] Error response:', error.response?.data);
      console.error('[promotionService] Error status:', error.response?.status);
      console.error('[promotionService] Error headers:', error.response?.headers);
      return { success: true, promotions: [] };
    }
  },

  calculateCartPromotion: async (cartData) => {
    try {
      console.log('[promotionService] calculateCartPromotion called with:', cartData);
      const response = await api.post('/settings/promotions/calculate', cartData);
      console.log('[promotionService] calculateCartPromotion response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[promotionService] calculateCartPromotion ERROR:', error);
      console.error('[promotionService] Error response:', error.response?.data);
      console.error('[promotionService] Error status:', error.response?.status);
      return { success: true, promotion: null, discount: 0 };
    }
  },

  checkProductPromotions: async (productId, isWholesale = false) => {
    try {
      const params = { is_wholesale: isWholesale };
      const response = await api.get(`/settings/promotions/product/${productId}`, { params });
      return response.data;
    } catch (error) {
      console.error('[promotionService] checkProductPromotions error:', error);
      return { success: true, promotion: null };
    }
  },

  getPromotionById: async (promotionId) => {
    try {
      const response = await api.get(`/settings/promotions/${promotionId}`);
      return response.data;
    } catch (error) {
      console.error('[promotionService] getPromotionById error:', error);
      return { success: false, promotion: null };
    }
  },

  createPromotion: async (promotionData) => {
    try {
      const response = await api.post('/settings/promotions', promotionData);
      return response.data;
    } catch (error) {
      console.error('[promotionService] createPromotion error:', error);
      throw error;
    }
  },

  updatePromotion: async (promotionId, promotionData) => {
    try {
      const response = await api.put(`/settings/promotions/${promotionId}`, promotionData);
      return response.data;
    } catch (error) {
      console.error('[promotionService] updatePromotion error:', error);
      throw error;
    }
  },

  deletePromotion: async (promotionId) => {
    try {
      const response = await api.delete(`/settings/promotions/${promotionId}`);
      return response.data;
    } catch (error) {
      console.error('[promotionService] deletePromotion error:', error);
      throw error;
    }
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

export default promotionService;