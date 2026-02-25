import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { TherapistDirectory } from './pages/TherapistDirectory';
import { TherapistProfile } from './pages/TherapistProfile';
import { BookAppointment } from './pages/BookAppointment';
import { BookingConfirmation } from './pages/booking/BookingConfirmation';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ClientDashboard } from './pages/Dashboard/ClientDashboard';
import { TherapistDashboard } from './pages/Dashboard/TherapistDashboard';
import { AdminDashboard } from './pages/Dashboard/AdminDashboard';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/therapists" element={<TherapistDirectory />} />
          <Route path="/therapists/:id" element={<TherapistProfile />} />
          <Route
            path="/book/:therapistId"
            element={
              <ProtectedRoute roles={['CLIENT']}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/confirmation"
            element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/client"
            element={
              <ProtectedRoute roles={['CLIENT']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/therapist"
            element={
              <ProtectedRoute roles={['THERAPIST']}>
                <TherapistDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
