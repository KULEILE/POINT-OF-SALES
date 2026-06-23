module.exports = {
  ROLES: {
    ADMIN:   'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier',
    AUDITOR: 'auditor',
  },
  STATUS: {
    ACTIVE:    'active',
    INACTIVE:  'inactive',
    SUSPENDED: 'suspended',
  },
  PAYMENT_METHODS: ['cash', 'card', 'mobile', 'credit', 'layby'],
  DEFAULT_TAX_RATE: 15.00,
  CURRENCY_SYMBOL:  'M',
  RECEIPT_PREFIX:   'KPOS',
  PAGE_SIZE:        20,
};
