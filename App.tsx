
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Contacts } from './pages/Contacts';
import { Opportunities } from './pages/Opportunities';
import { Expenses } from './pages/Expenses';
import { Admin } from './pages/Admin';
import { Activities } from './pages/Activities';
import { Settings } from './pages/Settings';
import { Layout } from './components/Layout';
import { AIAssistant } from './components/AIAssistant';
import { ImageGenerator } from './pages/ImageGenerator';
import { WhatsappBot } from './pages/WhatsappBot';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useApp();
  if (isLoading) return <div>Carregando...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      
      <Route path="/contacts" element={
        <PrivateRoute>
          <Contacts />
        </PrivateRoute>
      } />

      <Route path="/opportunities" element={
        <PrivateRoute>
          <Opportunities />
        </PrivateRoute>
      } />

      <Route path="/expenses" element={
        <PrivateRoute>
          <Expenses />
        </PrivateRoute>
      } />

      <Route path="/activities" element={
        <PrivateRoute>
          <Activities />
        </PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute>
          <Settings />
        </PrivateRoute>
      } />

      <Route path="/image-gen" element={
        <PrivateRoute>
          <ImageGenerator />
        </PrivateRoute>
      } />

      <Route path="/whatsapp-bot" element={
        <PrivateRoute>
          <WhatsappBot />
        </PrivateRoute>
      } />

      <Route path="/admin" element={
        <PrivateRoute>
          <Admin />
        </PrivateRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
        <AIAssistant />
      </HashRouter>
    </AppProvider>
  );
};

export default App;