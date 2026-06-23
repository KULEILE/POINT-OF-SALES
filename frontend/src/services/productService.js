import api from './api';
export const productService = {
  getAll:       (params) => api.get('/products', { params }),
  getById:      (id)     => api.get(`/products/${id}`),
  getByBarcode: (b)      => api.get(`/products/barcode/${b}`),
  getCategories:()       => api.get('/products/categories'),
  getLowStock:  ()       => api.get('/products/low-stock'),
  create:       (data)   => api.post('/products', data),
  update:       (id, d)  => api.put(`/products/${id}`, d),
};
