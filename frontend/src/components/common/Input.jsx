import React from 'react';

const Input = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-500 text-text-muted uppercase tracking-wider">{label}</label>}
    <input className={`k-input ${error ? 'border-danger' : ''} ${className}`} {...props} />
    {error && <span className="text-xs text-danger">{error}</span>}
  </div>
);

export default Input;
