import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { TabsProvider } from './contexts/TabsContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineBadge from './components/common/OfflineBadge';
import LoginPage from './pages/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';
import axiosClient from './api/axiosClient';
import { startBackgroundSync } from './utils/offlineQueue';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout />;
}

export default function App() {
  useEffect(() => {
    const stop = startBackgroundSync((url, opts) => axiosClient(url, opts as never) as unknown as Promise<Response>);
    return () => stop?.();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/*"
                  element={
                    <TabsProvider>
                      <ProtectedRoute />
                    </TabsProvider>
                  }
                />
              </Routes>
              <OfflineBadge fetchFn={(url, opts) => axiosClient(url, opts as never) as unknown as Promise<Response>} />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}