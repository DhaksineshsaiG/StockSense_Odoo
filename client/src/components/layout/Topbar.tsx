import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname: string): { title: string; subtitle: string } => {
    if (pathname.startsWith('/dashboard')) {
      return { title: 'Inventory Dashboard', subtitle: 'Real-time stock analytics & pending operations' };
    }
    if (pathname.startsWith('/products')) {
      return { title: 'Products & Stock', subtitle: 'Manage product catalog, SKUs, and inventory levels' };
    }
    if (pathname.startsWith('/categories')) {
      return { title: 'Product Categories', subtitle: 'Organize products into classification groups' };
    }

    if (pathname === '/operations/receipts') {
      return { title: 'Incoming Receipts', subtitle: 'Manage incoming shipments from vendors' };
    }
    if (pathname === '/operations/deliveries') {
      return { title: 'Delivery Orders', subtitle: 'Manage outgoing orders to customers' };
    }
    if (pathname === '/operations/transfers') {
      return { title: 'Internal Transfers', subtitle: 'Move stock between warehouses and locations' };
    }
    if (pathname === '/operations/adjustments') {
      return { title: 'Inventory Adjustments', subtitle: 'Physical count corrections and audit balance' };
    }
    if (pathname.startsWith('/operations')) {
      return { title: 'Inventory Operations', subtitle: 'Manage all warehouse stock operations' };
    }
    if (pathname.startsWith('/ledger')) {
      return { title: 'Stock Ledger', subtitle: 'Double-entry stock moves audit history' };
    }
    if (pathname.startsWith('/warehouses')) {
      return { title: 'Warehouses & Locations', subtitle: 'Multi-warehouse facilities and storage bins' };
    }
    if (pathname.startsWith('/settings')) {
      return { title: 'System Settings', subtitle: 'Configure StockSense system preferences' };
    }
    if (pathname.startsWith('/profile')) {
      return { title: 'User Profile', subtitle: 'Account settings & permissions' };
    }
    return { title: 'StockSense', subtitle: 'Inventory SaaS Application' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-primary-950/8 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-primary-800/60 hover:text-primary-950 hover:bg-primary-950/5 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-primary-950 tracking-tight leading-tight">{title}</h1>
          <p className="text-xs text-primary-800/60 hidden sm:block">{subtitle}</p>
        </div>
      </div>

      {/* Middle/Right: Search & Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Search Bar */}
        <div className="relative hidden md:block w-52 lg:w-64">
          <Search className="w-4 h-4 text-primary-800/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search SKU or Ref..."
            className="w-full text-xs glass-input rounded-lg pl-9 pr-3 py-1.5 focus:outline-none placeholder:text-primary-800/40"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-primary-950/10 hidden sm:block" />

        {/* User Info & Quick Logout */}
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity cursor-pointer"
            title="View Profile"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-primary-950 group-hover:text-primary-700 transition-colors leading-tight">{user?.name}</p>
              <p className="text-[10px] text-primary-800/50 capitalize">{user?.role?.toLowerCase() || 'staff'}</p>
            </div>

            <div className="w-8 h-8 rounded-lg bg-primary-950 text-ivory-200 flex items-center justify-center text-xs font-bold uppercase shadow-sm border border-primary-800/30 group-hover:ring-2 group-hover:ring-primary-800/20 transition-all">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
          </Link>

          <button
            onClick={logout}
            title="Log out of StockSense"
            className="p-2 rounded-lg text-primary-800/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
