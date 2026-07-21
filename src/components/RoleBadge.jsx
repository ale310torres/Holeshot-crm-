import React from 'react';
import { ROLE_LABELS } from '../utils/constants.js';

const roleColors = {
  owner: 'bg-brand-navy text-white',
  admin: 'bg-blue-50 text-brand-blue',
  manager: 'bg-cyan-50 text-cyan-700',
  rep: 'bg-slate-100 text-slate-700',
};

export default function RoleBadge({ role }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${roleColors[role] || 'bg-slate-100 text-slate-700'}`}>
      {ROLE_LABELS[role] || role || 'Usuario'}
    </span>
  );
}



