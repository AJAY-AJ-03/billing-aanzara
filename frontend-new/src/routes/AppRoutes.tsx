import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AdminLayout from '../components/layout/AdminLayout';
import BillingLayout from '../components/layout/BillingLayout';

import LoginPage from '../pages/auth/LoginPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import ProductsPage from '../pages/admin/ProductsPage';
import CategoriesPage from '../pages/admin/CategoriesPage';
import StockPage from '../pages/admin/StockPage';
import OffersPage from '../pages/admin/OffersPage';
import SalesPage from '../pages/admin/SalesPage';
import ReportsPage from '../pages/admin/ReportsPage';
import UsersPage from '../pages/admin/UsersPage';

import BillingDashboardPage from '../pages/billing/BillingDashboardPage';
import CreateBillPage from '../pages/billing/CreateBillPage';
import BillingHistoryPage from '../pages/billing/BillingHistoryPage';
import InvoicePage from '../pages/billing/InvoicePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route element={<ProtectedRoute requiredRole="Admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* Billing Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/billing" element={<BillingLayout />}>
          <Route path="dashboard" element={<BillingDashboardPage />} />
          <Route path="create" element={<CreateBillPage />} />
          <Route path="history" element={<BillingHistoryPage />} />
          <Route path="invoice/:id" element={<InvoicePage />} />
          <Route index element={<Navigate to="create" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
