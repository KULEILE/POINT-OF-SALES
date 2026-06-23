import React, { useEffect } from 'react';
import logo from '../assets/logo.png';

const Splash = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-surface-bg flex flex-col items-center justify-center gap-6">
      <img src={logo} alt="K-POINT OF SALES" className="h-16 object-contain bg-white rounded-xl px-4 py-2" />
      <div className="w-56 h-1 bg-surface-border rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[loading_2s_ease-in-out_forwards]" style={{ animation: 'width 2.2s ease forwards', width: '0%', transition: 'width 2.2s ease' }} />
      </div>
      <p className="text-xs text-text-faint tracking-widest uppercase">Loading system...</p>
      <style>{`
        @keyframes grow { from { width: 0% } to { width: 100% } }
        .grow-bar { animation: grow 2.2s ease forwards; }
      `}</style>
    </div>
  );
};

export default Splash;
