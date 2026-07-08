import api from './api';

export const shiftService = {
  /**
   * Get current open shift for logged-in user
   */
  getCurrentShift: async () => {
    const response = await api.get('/shifts/current');
    return response.data;
  },

  /**
   * Clock in - Start a new shift
   */
  clockIn: async (data) => {
    const response = await api.post('/shifts/clock-in', data);
    return response.data;
  },

  /**
   * Clock out - End current shift
   */
  clockOut: async (data) => {
    const response = await api.post('/shifts/clock-out', data);
    return response.data;
  },

  /**
   * Get all shifts (Admin/Manager only)
   */
  getAllShifts: async (params = {}) => {
    const response = await api.get('/shifts', { params });
    return response.data;
  },

  /**
   * Get shift by ID
   */
  getShiftById: async (shiftId) => {
    const response = await api.get(`/shifts/${shiftId}`);
    return response.data;
  },

  /**
   * Reconcile shift (Admin/Manager only)
   */
  reconcileShift: async (shiftId, data) => {
    const response = await api.post(`/shifts/${shiftId}/reconcile`, data);
    return response.data;
  },

  /**
   * Get shift summary
   */
  getShiftSummary: async (userId = null) => {
    const params = userId ? { user_id: userId } : {};
    const response = await api.get('/shifts/summary', { params });
    return response.data;
  }
};

export default shiftService;