import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  LayoutGrid,
} from 'lucide-react';

interface OperationsNavTabsProps {
  activeTab?: 'hub' | 'receipts' | 'deliveries' | 'transfers' | 'adjustments';
}

export const OperationsNavTabs: React.FC<OperationsNavTabsProps> = () => {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-primary-950 text-ivory-100 shadow-sm border border-primary-800/30'
        : 'text-primary-800/60 hover:text-primary-950 hover:bg-primary-950/[0.04]'
    }`;

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-primary-950/[0.04] border border-primary-950/10 overflow-x-auto no-scrollbar">
      <NavLink to="/operations" end className={tabClass}>
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Hub</span>
      </NavLink>

      <NavLink to="/operations/receipts" className={tabClass}>
        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
        <span>Receipts</span>
      </NavLink>

      <NavLink to="/operations/deliveries" className={tabClass}>
        <ArrowUpRight className="w-3.5 h-3.5 text-primary-900" />
        <span>Deliveries</span>
      </NavLink>

      <NavLink to="/operations/transfers" className={tabClass}>
        <ArrowLeftRight className="w-3.5 h-3.5 text-primary-900" />
        <span>Transfers</span>
      </NavLink>

      <NavLink to="/operations/adjustments" className={tabClass}>
        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
        <span>Adjustments</span>
      </NavLink>
    </div>
  );
};

export default OperationsNavTabs;
