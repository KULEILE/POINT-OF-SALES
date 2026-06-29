import api from './api';

export const reportService = {
  summary: () => api.get('/reports/summary'),
  dailySales: () => api.get('/reports/daily-sales'),
  topProducts: (params) => api.get('/reports/top-products', { params }),
  inventoryStatus: () => api.get('/reports/inventory'),
  cashierPerformance: () => api.get('/reports/cashier-performance'),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
  expiredProducts: () => api.get('/reports/expired-products'),
};