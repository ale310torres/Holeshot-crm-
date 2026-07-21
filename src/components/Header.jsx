import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { APP_NAME, NAV_ITEMS } from '../utils/constants.js';

export default function Header() {
  const { profile, organization, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
    setSigningOut(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3 lg:hidden">
            <Menu className="h-6 w-6 text-brand-navy" />
            <Link to="/" className="font-bold text-brand-navy">
              {APP_NAME}
            </Link>
          </div>
          <p className="hidden text-sm text-slate-500 lg:block">Organizacion</p>
          <h1 className="hidden truncate text-xl font-bold text-brand-navy lg:block">
            {organization?.name || 'Holeshot'}
          </h1>
        </div>

        <div className="hidden flex-1 gap-2 overflow-x-auto lg:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className="whitespace-nowrap text-sm">
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-brand-navy">{profile?.full_name || profile?.email}</p>
            <p className="text-xs capitalize text-slate-500">{profile?.role || 'usuario'}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{signingOut ? 'Saliendo...' : 'Salir'}</span>
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold',
                isActive ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-700',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}



