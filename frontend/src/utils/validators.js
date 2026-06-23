export const isEmail    = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPhone    = (v) => /^(\+266)?[0-9]{8}$/.test(v.replace(/\s/g,''));
export const isRequired = (v) => v !== null && v !== undefined && String(v).trim() !== '';
export const minLength  = (v, n) => String(v).length >= n;
export const isPositive = (v) => parseFloat(v) > 0;
export const isNumber   = (v) => !isNaN(parseFloat(v)) && isFinite(v);

export const validateProduct = (data) => {
  const errors = {};
  if (!isRequired(data.name))          errors.name         = 'Product name is required.';
  if (!isRequired(data.sku))           errors.sku          = 'SKU is required.';
  if (!isPositive(data.selling_price)) errors.selling_price= 'Selling price must be greater than 0.';
  if (!isNumber(data.cost_price))      errors.cost_price   = 'Cost price is required.';
  return errors;
};

export const validateUser = (data) => {
  const errors = {};
  if (!isRequired(data.full_name))     errors.full_name = 'Full name is required.';
  if (!isRequired(data.username) || !minLength(data.username, 3)) errors.username = 'Username must be at least 3 characters.';
  if (!isRequired(data.password) || !minLength(data.password, 6)) errors.password = 'Password must be at least 6 characters.';
  if (!isRequired(data.role))          errors.role = 'Role is required.';
  if (data.email && !isEmail(data.email)) errors.email = 'Invalid email format.';
  return errors;
};

export const validateCustomer = (data) => {
  const errors = {};
  if (!isRequired(data.full_name)) errors.full_name = 'Full name is required.';
  if (data.email && !isEmail(data.email)) errors.email = 'Invalid email format.';
  return errors;
};
