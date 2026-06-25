export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPhone = (v) => /^(\+266)?[0-9]{8}$/.test(v.replace(/\s/g,''));
export const isRequired = (v) => v !== null && v !== undefined && String(v).trim() !== '';
export const minLength = (v, n) => String(v).length >= n;
export const isPositive = (v) => parseFloat(v) > 0;
export const isNumber = (v) => !isNaN(parseFloat(v)) && isFinite(v);
export const isInteger = (v) => Number.isInteger(parseFloat(v)) && parseFloat(v) >= 0;

export const validateProduct = (data) => {
  const errors = {};
  if (!isRequired(data.name)) errors.name = 'Product name is required.';
  if (!isRequired(data.sku)) errors.sku = 'SKU is required.';
  if (!isPositive(data.selling_price)) errors.selling_price = 'Selling price must be greater than 0.';
  if (!isNumber(data.cost_price)) errors.cost_price = 'Cost price is required.';
  if (!isNumber(data.quantity) || !isInteger(data.quantity)) {
    errors.quantity = 'Quantity must be a valid number.';
  }
  if (parseFloat(data.quantity) < 0) {
    errors.quantity = 'Quantity cannot be negative.';
  }
  return errors;
};

export const validateUser = (data) => {
  const errors = {};
  if (!isRequired(data.full_name)) errors.full_name = 'Full name is required.';
  if (!isRequired(data.username) || !minLength(data.username, 3)) {
    errors.username = 'Username must be at least 3 characters.';
  }
  if (!isRequired(data.password) || !minLength(data.password, 6)) {
    errors.password = 'Password must be at least 6 characters.';
  }
  if (!isRequired(data.role)) errors.role = 'Role is required.';
  if (data.email && !isEmail(data.email)) errors.email = 'Invalid email format.';
  return errors;
};

export const validateCustomer = (data) => {
  const errors = {};
  if (!isRequired(data.full_name)) errors.full_name = 'Full name is required.';
  if (data.email && !isEmail(data.email)) errors.email = 'Invalid email format.';
  if (data.phone && !isPhone(data.phone)) errors.phone = 'Invalid phone number format.';
  return errors;
};

export const validateCartStock = (cart) => {
  const errors = [];
  const insufficientStock = [];

  cart.forEach((item) => {
    const requestedQty = parseFloat(item.quantity) || 0;
    const availableQty = parseFloat(item.stock_quantity || item.quantity_available || item.stock || 0);

    if (requestedQty <= 0) {
      errors.push({
        product_id: item.product_id,
        name: item.name || 'Unknown product',
        message: 'Quantity must be greater than 0.'
      });
    }

    if (requestedQty > availableQty) {
      insufficientStock.push({
        product_id: item.product_id,
        name: item.name || 'Unknown product',
        requested: requestedQty,
        available: availableQty,
        message: `Requested ${requestedQty}, Available ${availableQty}`
      });
    }
  });

  return {
    hasErrors: errors.length > 0 || insufficientStock.length > 0,
    errors,
    insufficientStock,
    message: insufficientStock.length > 0 
      ? `Insufficient stock for: ${insufficientStock.map(i => `"${i.name}" (${i.requested} > ${i.available})`).join(', ')}`
      : errors.length > 0 
        ? errors.map(e => e.message).join(', ')
        : null
  };
};

export const validateProductStock = (product, quantity = 1) => {
  const requestedQty = parseFloat(quantity) || 0;
  const availableQty = parseFloat(product.stock_quantity || product.quantity || product.stock || 0);

  if (requestedQty <= 0) {
    return {
      valid: false,
      message: 'Quantity must be greater than 0.'
    };
  }

  if (requestedQty > availableQty) {
    return {
      valid: false,
      message: `Only ${availableQty} units available. Requested: ${requestedQty}`
    };
  }

  return {
    valid: true,
    message: null
  };
};

export const validateSale = (data) => {
  const errors = {};

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.items = 'Cart is empty.';
  }

  if (!isRequired(data.payment_method)) {
    errors.payment_method = 'Payment method is required.';
  }

  if (data.payment_method === 'cash') {
    const amountPaid = parseFloat(data.amount_paid) || 0;
    const total = parseFloat(data.total) || 0;
    
    if (!isPositive(amountPaid)) {
      errors.amount_paid = 'Amount paid must be greater than 0.';
    } else if (amountPaid < total) {
      errors.amount_paid = `Amount paid (${amountPaid}) is less than total (${total}).`;
    }
  }

  if (data.payment_method === 'credit' && !data.customer_id) {
    errors.customer_id = 'Customer is required for credit sales.';
  }

  return errors;
};