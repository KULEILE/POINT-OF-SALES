import api from './api';

export const holdService = {
  create: (data) => api.post('/holds', data),
  getAll: () => api.get('/holds'),
  getById: (id) => api.get(`/holds/${id}`),
  resume: (id) => api.put(`/holds/${id}/resume`),
  remove: (id) => api.delete(`/holds/${id}`),
};