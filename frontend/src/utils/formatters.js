export const formatCurrency = (amount, symbol = 'M') =>
  `${symbol} ${parseFloat(amount || 0).toFixed(2)}`;

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-LS', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-LS', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' });

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export const roleColor = (role) => ({
  admin:   'k-badge-red',
  manager: 'k-badge-cyan',
  cashier: 'k-badge-blue',
  auditor: 'k-badge-amber',
}[role] || 'k-badge-cyan');

export const statusColor = (status) => ({
  active:    'k-badge-green',
  inactive:  'k-badge-red',
  suspended: 'k-badge-amber',
  completed: 'k-badge-green',
  pending:   'k-badge-amber',
  cancelled: 'k-badge-red',
  refunded:  'k-badge-amber',
  paid:      'k-badge-green',
  overdue:   'k-badge-red',
  partial:   'k-badge-amber',
}[status] || 'k-badge-cyan');

export const stockStatusColor = (status) => ({
  in_stock:     'k-badge-green',
  low_stock:    'k-badge-amber',
  out_of_stock: 'k-badge-red',
}[status] || 'k-badge-cyan');
