import React from 'react';
import logo from '../../assets/logo.png';

const Loader = ({ fullscreen = false, message = 'Loading...' }) => {
  if (fullscreen) return (
    <div className="fixed inset-0 bg-surface-bg flex flex-col items-center justify-center gap-4 z-50">
      <img src={logo} alt="K-POINT OF SALES" className="h-12 object-contain bg-white rounded-lg px-3 py-1" />
      <div className="w-48 h-1 bg-surface-border rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-surface-border border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default Loader;
