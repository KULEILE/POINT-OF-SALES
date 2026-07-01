import api from './api';

export const saleService = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  getByReceipt: (receiptNumber) => api.get(`/sales/receipt/${receiptNumber}`),
  todaySummary: () => api.get('/sales/summary/today'),
};