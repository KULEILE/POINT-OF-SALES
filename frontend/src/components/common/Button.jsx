import React from 'react';

const variants = {
  primary: 'k-btn-primary',
  accent:  'k-btn-accent',
  danger:  'k-btn-danger',
  outline: 'k-btn-outline',
  ghost:   'k-btn-ghost',
};

const Button = ({ children, variant = 'primary', className = '', loading = false, disabled = false, fullWidth = false, ...props }) => (
  <button
    className={`${variants[variant]} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? 'Loading...' : children}
  </button>
);

export default Button;
