import api from './api';

export const holdService = {
  /**
   * Hold the current cart as a saved sale
   */
  create: (data) => api.post('/holds', data),

  /**
   * Get all active held sales
   */
  getAll: async () => {
    const response = await api.get('/holds');
    return response.data;
  },

  /**
   * Get a single held sale by id
   */
  getById: async (holdId) => {
    const response = await api.get(`/holds/${holdId}`);
    return response.data;
  },

  /**
   * Remove a held sale (used both when resuming it and when deleting it outright)
   */
  remove: async (holdId) => {
    const response = await api.delete(`/holds/${holdId}`);
    return response.data;
  }
};

export default holdService;