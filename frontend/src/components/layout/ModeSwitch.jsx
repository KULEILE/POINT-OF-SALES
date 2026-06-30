import React from 'react';

const MODES = [
  { key: 'cash', label: 'Cash Sale' },
  { key: 'credit', label: 'Credit Sale' },
  { key: 'layby', label: 'Lay-by' },
];

const ModeSwitch = ({ active, onChange }) => {
  return (
    <div className="flex bg-surface-panel border border-surface-border rounded-xl p-1 gap-1">
      {MODES.map(mode => (
        <button
          key={mode.key}
          onClick={() => onChange(mode.key)}
          className={`px-4 py-1.5 rounded-lg text-xs font-600 transition-all
            ${active === mode.key
              ? 'bg-surface-card text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-primary'}`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
};

export default ModeSwitch;