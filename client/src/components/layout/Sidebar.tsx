import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse as WarehouseIcon,
  Settings,
  ChevronDown,
  LogOut,
  X,
  ShieldCheck,
  UserCheck,
  FolderTree,
  LayoutGrid,
  User as UserIcon,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [operationsOpen, setOperationsOpen] = useState(() => {
    return location.pathname.startsWith('/operations');
  });

  const isOperationsActive = location.pathname.startsWith('/operations');

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
      isActive
        ? 'bg-ivory-200/20 text-ivory-100 shadow-sm border border-ivory-200/10'
        : 'text-ivory-400 hover:text-ivory-100 hover:bg-ivory-200/[0.08]'
    }`;

  const subNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
      isActive
        ? 'bg-ivory-200/15 text-ivory-100 font-semibold border-l-2 border-ivory-300 pl-2.5'
        : 'text-ivory-500 hover:text-ivory-200 hover:bg-ivory-200/[0.06]'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container — Deep Maroon */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-primary-950 border-r border-primary-800/30 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-ivory-200/8">
          <NavLink to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-ivory-200/15 flex items-center justify-center shadow-sm border border-ivory-200/10 group-hover:bg-ivory-200/20 transition-colors">
              <Package className="w-5 h-5 text-ivory-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-ivory-100 tracking-tight">StockSense</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-ivory-200/10 text-ivory-300 border border-ivory-200/10">
                  Odoo
                </span>
              </div>
              <p className="text-[10px] text-ivory-500 tracking-wider">INVENTORY SAAS</p>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-ivory-400 hover:text-ivory-100 hover:bg-ivory-200/10"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-ivory-500 uppercase tracking-widest">
            Core Modules
          </div>

          <NavLink to="/dashboard" className={navItemClass} onClick={onClose}>
            <LayoutDashboard className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/products" className={navItemClass} onClick={onClose}>
            <Package className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Products & Stock</span>
          </NavLink>

          <NavLink to="/categories" className={navItemClass} onClick={onClose}>
            <FolderTree className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Categories</span>
          </NavLink>


          {/* Operations Dropdown */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setOperationsOpen(!operationsOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isOperationsActive
                  ? 'bg-ivory-200/10 text-ivory-200'
                  : 'text-ivory-400 hover:text-ivory-100 hover:bg-ivory-200/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
                <span>Operations</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  operationsOpen ? 'rotate-180 text-ivory-300' : 'text-ivory-500'
                }`}
              />
            </button>

            {operationsOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-ivory-200/10 space-y-1">
                <NavLink to="/operations" end className={subNavItemClass} onClick={onClose}>
                  <LayoutGrid className="w-3.5 h-3.5 text-ivory-400" />
                  <span>Operations Hub</span>
                </NavLink>
                <NavLink to="/operations/receipts" className={subNavItemClass} onClick={onClose}>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Receipts</span>
                </NavLink>
                <NavLink to="/operations/deliveries" className={subNavItemClass} onClick={onClose}>
                  <ArrowUpRight className="w-3.5 h-3.5 text-ivory-400" />
                  <span>Delivery Orders</span>
                </NavLink>
                <NavLink to="/operations/transfers" className={subNavItemClass} onClick={onClose}>
                  <ArrowLeftRight className="w-3.5 h-3.5 text-ivory-400" />
                  <span>Internal Transfers</span>
                </NavLink>
                <NavLink to="/operations/adjustments" className={subNavItemClass} onClick={onClose}>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Adjustments</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/ledger" className={navItemClass} onClick={onClose}>
            <History className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Stock Ledger</span>
          </NavLink>

          <NavLink to="/warehouses" className={navItemClass} onClick={onClose}>
            <WarehouseIcon className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Warehouses</span>
          </NavLink>

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold text-ivory-500 uppercase tracking-widest">
            System
          </div>

          <NavLink to="/profile" className={navItemClass} onClick={onClose}>
            <UserIcon className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Profile</span>
          </NavLink>

          <NavLink to="/settings" className={navItemClass} onClick={onClose}>
            <Settings className="w-4 h-4 text-ivory-400 group-hover:text-ivory-200 transition-colors" />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-ivory-200/8 bg-primary-950/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-ivory-200/[0.05] border border-ivory-200/8">
            <NavLink
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity flex-1"
              title="View Profile"
            >
              <div className="w-8 h-8 rounded-lg bg-ivory-200/15 flex items-center justify-center font-bold text-xs text-ivory-200 uppercase shadow-sm flex-shrink-0 group-hover:bg-ivory-200/20 transition-colors">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ivory-200 truncate group-hover:text-ivory-100 transition-colors">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {user?.role === 'MANAGER' ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      <ShieldCheck className="w-2.5 h-2.5" /> MANAGER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-ivory-300 bg-ivory-200/10 px-1.5 py-0.5 rounded border border-ivory-200/10">
                      <UserCheck className="w-2.5 h-2.5" /> STAFF
                    </span>
                  )}
                </div>
              </div>
            </NavLink>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-ivory-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 flex-shrink-0"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
