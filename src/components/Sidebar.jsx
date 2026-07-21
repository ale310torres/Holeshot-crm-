import React from 'react';
import { BarChart3, CheckSquare, Gauge, KanbanSquare, Settings, Users, UserRoundSearch } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { APP_NAME, NAV_ITEMS } from '../utils/constants.js';

const iconMap = {
  Dashboard: Gauge,
  Leads: UserRoundSearch,
  Pipeline: KanbanSquare,
  Tareas: CheckSquare,
  Reportes: BarChart3,
  Usuarios: Users,
  Configuracion: Settings,
};

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-brand-navy text-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-blue font-black">HS</div>
        <div>
          <p className="text-lg font-bold leading-tight">{APP_NAME}</p>
          <p className="text-xs text-cyan-100">Ventas, piezas y servicio</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.label] || Gauge;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition',
                  isActive ? 'bg-white text-brand-navy shadow-soft' : 'text-slate-200 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.label}
              </span>
              {!item.enabled && <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-cyan-100">Pronto</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-5 text-xs text-slate-300">
        Preparado para ventas, seguimientos, equipo y automatizaciones con n8n.
      </div>
    </aside>
  );
}


