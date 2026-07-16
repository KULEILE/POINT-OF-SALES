import api from './api';

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (b) => api.get(`/products/barcode/${b}`),
  getCategories: () => api.get('/products/categories'),
  getLowStock: () => api.get('/products/low-stock'),
  getExpiredProducts: () => api.get('/products/expired'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};