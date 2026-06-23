import React from 'react';

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className={`bg-surface-card border border-surface-border rounded-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h3 className="text-base font-700 text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-2xl leading-none transition-colors">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
