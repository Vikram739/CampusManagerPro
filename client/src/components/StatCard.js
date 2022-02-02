import React from 'react';

export default function StatCard({ icon, label, value, variant = 'primary', hint }) {
  return (
    <div className="card stat-card h-100">
      <div className="card-body d-flex align-items-center">
        <div className={`stat-icon bg-${variant} bg-opacity-10 text-${variant} me-3`}>
          <i className={`bi bi-${icon}`} />
        </div>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="fs-4 fw-bold lh-sm">{value}</div>
          {hint && <div className="text-muted small">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
