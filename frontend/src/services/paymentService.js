import api from './api';

export const paymentService = {
  processCreditPayment: (data) => api.post('/payments/credit', data),
  processLaybyPayment: (data) => api.post('/payments/layby', data),
  processSplitPayment: (data) => api.post('/payments/split', data),
  getPaymentSplits: (transactionId) => api.get(`/payments/splits/${transactionId}`),
  getCustomerPayments: (customerId) => api.get(`/payments/customer/${customerId}`),
  getCustomerLaybys: (customerId) => api.get(`/payments/customer/${customerId}/layby`),
};