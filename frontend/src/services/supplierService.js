import api from './api';
export const supplierService = {
  getAll:  (params) => api.get('/suppliers', { params }),
  getById: (id)     => api.get(`/suppliers/${id}`),
  create:  (data)   => api.post('/suppliers', data),
  update:  (id, d)  => api.put(`/suppliers/${id}`, d),
};
