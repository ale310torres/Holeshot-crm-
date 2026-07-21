import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen bg-brand-light text-slate-900">
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}



