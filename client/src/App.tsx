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
import { UserProfile } from './pages/UserProfile';
import { PrivacyTerms } from './pages/PrivacyTerms';
import { ComposeForm } from './pages/forms/ComposeForm';
import { FillForm } from './pages/forms/FillForm';
import { FormDetail } from './pages/forms/FormDetail';
import { TherapyPlansDirectory } from './pages/therapy-plans/TherapyPlansDirectory';
import { TherapyPlanDetail } from './pages/therapy-plans/TherapyPlanDetail';
import { EditTherapyPlan } from './pages/therapy-plans/EditTherapyPlan';
import { Gallery } from './pages/Gallery';
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
          <Route path="/privacy" element={<PrivacyTerms />} />

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
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
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

          {/* Gallery */}
          <Route path="/gallery" element={<Gallery />} />

          {/* Therapy Plans */}
          <Route path="/therapy-plans" element={<TherapyPlansDirectory />} />
          <Route path="/therapy-plans/:id" element={<TherapyPlanDetail />} />
          <Route
            path="/therapy-plans/create"
            element={
              <ProtectedRoute roles={['THERAPIST']}>
                <EditTherapyPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapy-plans/:id/edit"
            element={
              <ProtectedRoute roles={['THERAPIST', 'ADMIN']}>
                <EditTherapyPlan />
              </ProtectedRoute>
            }
          />

          {/* Form system */}
          <Route
            path="/forms/new"
            element={
              <ProtectedRoute roles={['THERAPIST', 'ADMIN']}>
                <ComposeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id"
            element={
              <ProtectedRoute roles={['CLIENT']}>
                <FillForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id/responses"
            element={
              <ProtectedRoute roles={['THERAPIST', 'ADMIN']}>
                <FormDetail />
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
