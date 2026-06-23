import React from 'react';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { key: 'cash',   label: 'Cash Sale'  },
  { key: 'credit', label: 'Credit Sale' },
  { key: 'layby',  label: 'Lay-by'     },
];

const ModeSwitch = ({ active, onChange }) => {
  const { hasRole } = useAuth();
  return (
    <div className="flex gap-1 bg-surface-bg border border-surface-border rounded-lg p-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 text-xs font-600 py-1.5 px-3 rounded-md transition-all
            ${active === tab.key ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ModeSwitch;
