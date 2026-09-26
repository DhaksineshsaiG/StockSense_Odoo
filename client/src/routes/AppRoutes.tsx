import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { VerifyOtpPage } from '../pages/auth/VerifyOtpPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';

// App Pages
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { ProductsPage } from '../pages/Products/ProductsPage';
import { ProductDetailPage } from '../pages/Products/ProductDetailPage';
import { CategoriesPage } from '../pages/Categories/CategoriesPage';
import { PlaceholderPage } from '../pages/placeholder/PlaceholderPage';

// Operations Pages
import { OperationsHubPage } from '../pages/Operations/OperationsHubPage';
import { ReceiptsListPage } from '../pages/Operations/ReceiptsListPage';
import { ReceiptDetailPage } from '../pages/Operations/ReceiptDetailPage';
import { DeliveriesListPage } from '../pages/Operations/DeliveriesListPage';
import { DeliveryDetailPage } from '../pages/Operations/DeliveryDetailPage';
import { TransfersListPage } from '../pages/Operations/TransfersListPage';
import { TransferDetailPage } from '../pages/Operations/TransferDetailPage';
import { AdjustmentsListPage } from '../pages/Operations/AdjustmentsListPage';
import { AdjustmentDetailPage } from '../pages/Operations/AdjustmentDetailPage';

// Ledger Pages
import { LedgerPage } from '../pages/Ledger/LedgerPage';
import { MoveDetailPage } from '../pages/Ledger/MoveDetailPage';

// Warehouse Pages
import { WarehousesPage } from '../pages/Warehouses/WarehousesPage';
import { WarehouseDetailPage } from '../pages/Warehouses/WarehouseDetailPage';

// Profile & Settings Pages
import { ProfilePage } from '../pages/Profile/ProfilePage';
import { SettingsPage } from '../pages/Settings/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* Protected SaaS Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Products & Categories Module */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />

          {/* Operations Modules */}
          <Route path="/operations" element={<OperationsHubPage />} />

          {/* Receipts */}
          <Route path="/operations/receipts" element={<ReceiptsListPage />} />
          <Route path="/operations/receipts/:id" element={<ReceiptDetailPage />} />

          {/* Deliveries */}
          <Route path="/operations/deliveries" element={<DeliveriesListPage />} />
          <Route path="/operations/deliveries/:id" element={<DeliveryDetailPage />} />

          {/* Internal Transfers */}
          <Route path="/operations/transfers" element={<TransfersListPage />} />
          <Route path="/operations/transfers/:id" element={<TransferDetailPage />} />

          {/* Inventory Adjustments */}
          <Route path="/operations/adjustments" element={<AdjustmentsListPage />} />
          <Route path="/operations/adjustments/:id" element={<AdjustmentDetailPage />} />

          {/* Ledger / Moves */}
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/ledger/:id" element={<MoveDetailPage />} />

          {/* Warehouses & Locations */}
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />

          {/* Settings & Profile */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
