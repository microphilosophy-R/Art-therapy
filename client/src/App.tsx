import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import {
  Home,
  TherapistDirectory,
  TherapistProfile,
  BookAppointment,
  BookingConfirmation,
  Login,
  Register,
  AdminDashboard,
  MemberDashboard,
  UserProfile,
  PrivacyTerms,
  ComposeForm,
  FillForm,
  FormDetail,
  TherapyPlansDirectory,
  TherapyPlanDetail,
  TherapyPlanSignup,
  EditTherapyPlan,
  ProductWizard,
  Gallery,
  ShopPage,
  ProductDetailsPage,
  CartPage,
  CheckoutPage,
  MyOrdersPage,
  MessagesPage,
  MyPlansPage,
} from '@/pages';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({
  children,
  roles,
  certificates,
  anyCertificates,
}: {
  children: React.ReactNode;
  roles?: string[];
  certificates?: string[];
  anyCertificates?: string[];
}) => {
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated || !user || !accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (certificates && user?.role !== 'ADMIN') {
    const approved = user?.approvedCertificates ?? [];
    const hasRequired = certificates.every((c) => approved.includes(c));
    if (!hasRequired) return <Navigate to="/dashboard/member" replace />;
  }
  if (anyCertificates && user?.role !== 'ADMIN') {
    const approved = user?.approvedCertificates ?? [];
    const hasAnyRequired = anyCertificates.some((c) => approved.includes(c));
    if (!hasAnyRequired) return <Navigate to="/dashboard/member" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/therapists" element={<TherapistDirectory />} />
          <Route path="/therapists/:id" element={<TherapistProfile />} />
          <Route path="/privacy" element={<PrivacyTerms />} />

          <Route
            path="/book/:therapistId"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']}>
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
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-plans"
            element={
              <ProtectedRoute>
                <MyPlansPage />
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
          <Route
            path="/dashboard/member"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']}>
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          {/* Gallery */}
          <Route path="/gallery" element={<Gallery />} />

          {/* E-commerce Shop */}
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/product-wizard"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} certificates={['ARTIFICER']}>
                <ProductWizard />
              </ProtectedRoute>
            }
          />

          {/* Therapy Plans */}
          <Route path="/therapy-plans" element={<TherapyPlansDirectory />} />
          <Route path="/therapy-plans/:id" element={<TherapyPlanDetail />} />
          <Route
            path="/therapy-plans/:id/signup"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']}>
                <TherapyPlanSignup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapy-plans/create"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} anyCertificates={['THERAPIST', 'COUNSELOR']}>
                <EditTherapyPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapy-plans/:id/edit"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} anyCertificates={['THERAPIST', 'COUNSELOR']}>
                <EditTherapyPlan />
              </ProtectedRoute>
            }
          />

          {/* Form system */}
          <Route
            path="/forms/new"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} certificates={['THERAPIST']}>
                <ComposeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']}>
                <FillForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id/responses"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} certificates={['THERAPIST']}>
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
