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
import { AdminDashboard } from './pages/Dashboard/AdminDashboard';
import { MemberDashboard } from './pages/Dashboard/MemberDashboard';
import { UserProfile } from './pages/UserProfile';
import { PrivacyTerms } from './pages/PrivacyTerms';
import { ComposeForm } from './pages/forms/ComposeForm';
import { FillForm } from './pages/forms/FillForm';
import { FormDetail } from './pages/forms/FormDetail';
import { TherapyPlansDirectory } from '@/pages/therapy-plans/TherapyPlansDirectory';
import { TherapyPlanDetail } from '@/pages/therapy-plans/TherapyPlanDetail';
import { TherapyPlanSignup } from '@/pages/therapy-plans/TherapyPlanSignup';
import { EditTherapyPlan } from '@/pages/therapy-plans/EditTherapyPlan';
import { ProductWizard } from '@/pages/Dashboard/ProductWizard';
import { Gallery } from './pages/Gallery';
import { ShopPage } from './pages/shop/ShopPage';
import { ProductDetailsPage } from './pages/shop/ProductDetailsPage';
import { CartPage } from './pages/shop/CartPage';
import { CheckoutPage } from './pages/shop/CheckoutPage';
import { MyOrdersPage } from './pages/user/MyOrdersPage';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({
  children,
  roles,
  certificates,
}: {
  children: React.ReactNode;
  roles?: string[];
  certificates?: string[];
}) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (certificates && user?.role !== 'ADMIN') {
    const approved = user?.approvedCertificates ?? [];
    const hasRequired = certificates.every((c) => approved.includes(c));
    if (!hasRequired) return <Navigate to="/dashboard/member" replace />;
  }
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
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} certificates={['THERAPIST']}>
                <EditTherapyPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/therapy-plans/:id/edit"
            element={
              <ProtectedRoute roles={['MEMBER', 'ADMIN']} certificates={['THERAPIST']}>
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
