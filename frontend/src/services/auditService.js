import api from './api';
export const auditService = {
  getAll: (params) => api.get('/audit', { params }),
};
