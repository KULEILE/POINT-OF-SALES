import React, { useState, useEffect } from 'react';
import { auditService } from '../services/auditService';
import { formatDateTime } from '../utils/formatters';

const AuditTrail = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action_type:'', username:'', date_from:'', date_to:'' });

  const load = () => {
    setLoading(true);
    auditService.getAll(filters).then(r => setLogs(r.data.logs)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6"><h2 className="text-lg font-700 text-text-primary">Audit Trail</h2><p className="text-sm text-text-muted">Full record of all system activity</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <input className="k-input" placeholder="Action type..." value={filters.action_type} onChange={e => setFilters({...filters,action_type:e.target.value})} />
        <input className="k-input" placeholder="Username..." value={filters.username} onChange={e => setFilters({...filters,username:e.target.value})} />
        <input type="date" className="k-input" value={filters.date_from} onChange={e => setFilters({...filters,date_from:e.target.value})} />
        <input type="date" className="k-input" value={filters.date_to} onChange={e => setFilters({...filters,date_to:e.target.value})} />
      </div>
      <div className="mb-4"><button onClick={load} className="k-btn-primary">Search</button></div>
      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Details</th><th>Table</th><th>Record</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-text-faint">Loading...</td></tr>
            : logs.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-text-faint">No audit logs found</td></tr>
            : logs.map(l => (
              <tr key={l.audit_id}>
                <td className="text-xs">{formatDateTime(l.created_at)}</td>
                <td className="font-mono text-xs">{l.username || '—'}</td>
                <td><span className="k-badge-cyan text-xs">{l.action_type}</span></td>
                <td className="max-w-xs truncate text-xs">{l.action_details || '—'}</td>
                <td className="font-mono text-xs">{l.affected_table || '—'}</td>
                <td className="text-xs">{l.affected_record_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTrail;
