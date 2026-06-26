import api from './api';

export const paymentService = {
  processCreditPayment: (data) => api.post('/payments/credit', data),
  processLaybyPayment: (data) => api.post('/payments/layby', data),
  getCustomerPayments: (customerId) => api.get(`/payments/customer/${customerId}`),
  getCustomerLaybys: (customerId) => api.get(`/payments/customer/${customerId}/layby`),
};