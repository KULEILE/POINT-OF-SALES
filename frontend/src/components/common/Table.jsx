import React from 'react';

const Table = ({ columns, data = [], loading = false, emptyMessage = 'No data found.' }) => (
  <div className="overflow-x-auto">
    <table className="k-table">
      <thead>
        <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={columns.length} className="text-center py-8 text-text-faint">Loading...</td></tr>
        ) : data.length === 0 ? (
          <tr><td colSpan={columns.length} className="text-center py-8 text-text-faint">{emptyMessage}</td></tr>
        ) : (
          data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default Table;
