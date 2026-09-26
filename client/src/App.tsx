import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Package } from 'lucide-react';

// Placeholder pages — full implementation in Step 4
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">StockSense</h1>
        <p className="text-surface-500">{title} — Coming in Step 4</p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Server & Client Running
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PlaceholderPage title="Login" />} />
        <Route path="/register" element={<PlaceholderPage title="Register" />} />
        <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="/products" element={<PlaceholderPage title="Products & Stock" />} />
        <Route path="/operations/*" element={<PlaceholderPage title="Operations" />} />
        <Route path="/moves" element={<PlaceholderPage title="Move History" />} />
        <Route path="/warehouses" element={<PlaceholderPage title="Warehouses & Locations" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
