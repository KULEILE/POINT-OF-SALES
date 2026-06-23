import api from './api';
export const userService = {
  getAll:         ()        => api.get('/users'),
  getById:        (id)      => api.get(`/users/${id}`),
  update:         (id, d)   => api.put(`/users/${id}`, d),
  changePassword: (data)    => api.put('/users/change-password', data),
  deactivate:     (id)      => api.delete(`/users/${id}`),
};
