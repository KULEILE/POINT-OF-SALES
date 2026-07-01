import api from './api';

export const returnService = {
  create: (data) => api.post('/returns', data),
  getByTransaction: (transactionId) => api.get(`/returns/transaction/${transactionId}`),
  getByCustomer: (customerId) => api.get(`/returns/customer/${customerId}`),
  getById: (id) => api.get(`/returns/${id}`),
  getAll: (params) => api.get('/returns', { params }),
};