import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LeadDetail from './pages/LeadDetail.jsx';
import Leads from './pages/Leads.jsx';
import Login from './pages/Login.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Tasks from './pages/Tasks.jsx';
import Users from './pages/Users.jsx';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light">
      <div className="rounded-lg bg-white px-8 py-6 text-center shadow-soft">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
        <p className="font-medium text-brand-navy">Cargando Holeshot CRM...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { session, loading, profileError } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-light px-4">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-soft">
          <h1 className="text-xl font-bold text-brand-navy">Acceso no disponible</h1>
          <p className="mt-3 text-slate-600">{profileError}</p>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="tareas" element={<Tasks />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="configuracion" element={<Settings />} />
      </Route>
    </Routes>
  );
}



