import api from './api';

export const customerService = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  getDetails: (id) => api.get(`/customers/${id}/details`),
  getBalances: () => api.get('/customers/balances'),
  create: (data) => api.post('/customers', data),
  update: (id, d) => api.put(`/customers/${id}`, d),
};