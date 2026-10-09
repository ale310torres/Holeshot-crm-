import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  const [darkMode, setDarkMode] = React.useState(() => {
    try { return localStorage.getItem('holeshot-theme') === 'dark'; } catch { return false; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('holeshot-theme', darkMode ? 'dark' : 'light'); } catch { /* Preference still works for this session. */ }
  }, [darkMode]);
  return (
    <div className={`crm-shell min-h-screen bg-brand-light text-slate-900${darkMode ? ' crm-dark' : ''}`}>
      <Sidebar />
      <div className="lg:pl-72">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode((current) => !current)} />
        <main className="crm-main mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}



