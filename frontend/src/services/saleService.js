import api from './api';
export const saleService = {
  create:       (data)   => api.post('/sales', data),
  getAll:       (params) => api.get('/sales', { params }),
  getById:      (id)     => api.get(`/sales/${id}`),
  todaySummary: ()       => api.get('/sales/summary/today'),
};
