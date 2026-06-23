import api from './api';
export const inventoryService = {
  getStatus:    ()       => api.get('/inventory/status'),
  getLowStock:  ()       => api.get('/inventory/low-stock'),
  getMovements: (params) => api.get('/inventory/movements', { params }),
  adjust:       (data)   => api.post('/inventory/adjust', data),
};
