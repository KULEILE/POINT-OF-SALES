import api from './api';
import { validateSale } from '../utils/validators';

export const saleService = {
  create: async (data) => {
    const errors = validateSale(data);
    
    if (Object.keys(errors).length > 0) {
      throw {
        response: {
          data: {
            success: false,
            message: Object.values(errors).join(', ')
          }
        }
      };
    }

    return api.post('/sales', data);
  },
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  todaySummary: () => api.get('/sales/summary/today'),
};