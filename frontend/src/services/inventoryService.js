import api from './api';

export const inventoryService = {
  getStatus: () => api.get('/inventory/status'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getExpiredProducts: () => api.get('/inventory/expired'),
  getMovements: (params) => api.get('/inventory/movements', { params }),
  adjust: (data) => api.post('/inventory/adjust', data),
  bulkAdjust: (data) => api.post('/inventory/bulk-adjust', data),
  transferStock: (data) => api.post('/inventory/transfer', data),
  reportExpired: (data) => api.post('/inventory/report-expired', data),
};