import React, { useState } from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { LowStockItem, OutOfStockItem } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface StockAlertTableProps {
  lowStockItems: LowStockItem[];
  outOfStockItems: OutOfStockItem[];
}

export const StockAlertTable: React.FC<StockAlertTableProps> = ({
  lowStockItems,
  outOfStockItems,
}) => {
  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');

  return (
    <div className="glass-card p-5">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-primary-950/10">
        <div>
          <h3 className="text-base font-bold text-primary-950 tracking-tight flex items-center gap-2">
            <span>Inventory Stock Health</span>
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </h3>
          <p className="text-xs text-primary-800/60 mt-0.5">
            Automated reorder threshold monitoring & stockouts
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-primary-950/[0.05] border border-primary-950/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('low')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'low'
                ? 'bg-amber-500/15 text-amber-800 border border-amber-500/25 shadow-sm'
                : 'text-primary-800/60 hover:text-primary-950'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-800 font-bold">
              {lowStockItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('out')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'out'
                ? 'bg-rose-500/15 text-rose-800 border border-rose-500/25 shadow-sm'
                : 'text-primary-800/60 hover:text-primary-950'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Out of Stock</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px] text-rose-800 font-bold">
              {outOfStockItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="mt-4 overflow-x-auto">
        {activeTab === 'low' ? (
          lowStockItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              title="All stock levels optimal"
              description="No products are currently below their configured reordering thresholds."
              className="py-12"
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Warehouse & Location</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">Free to Use</th>
                  <th className="py-2.5 px-3 text-right">Min Threshold</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {lowStockItems.map((item, idx) => (
                  <tr key={`${item.product.id}_${item.location.id}_${idx}`} className="hover:bg-primary-950/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-primary-950">{item.product.name}</div>
                      <div className="text-[11px] text-primary-800/50 font-mono mt-0.5">{item.product.sku}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-primary-900">{item.warehouse.name} ({item.warehouse.code})</div>
                      <div className="text-[11px] text-primary-800/60 mt-0.5">{item.location.name}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-amber-800">
                      {item.onHand} <span className="text-[10px] text-primary-800/50 font-normal">{item.product.uom}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-primary-900">
                      {item.freeToUse} <span className="text-[10px] text-primary-800/50 font-normal">{item.product.uom}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-primary-800/60">
                      {item.reorderThreshold} <span className="text-[10px] text-primary-800/40 font-normal">{item.product.uom}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-800 border border-amber-500/20">
                        Low Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          outOfStockItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              title="Zero stockouts detected"
              description="All tracked inventory locations have active available stock."
              className="py-12"
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Warehouse & Location</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">Reorder Threshold</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {outOfStockItems.map((item, idx) => (
                  <tr key={`${item.product.id}_${item.location.id}_${idx}`} className="hover:bg-primary-950/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-primary-950">{item.product.name}</div>
                      <div className="text-[11px] text-primary-800/50 font-mono mt-0.5">{item.product.sku}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-primary-900">{item.warehouse.name} ({item.warehouse.code})</div>
                      <div className="text-[11px] text-primary-800/60 mt-0.5">{item.location.name}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                      0 <span className="text-[10px] text-primary-800/50 font-normal">{item.product.uom}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-primary-800/60">
                      {item.reorderThreshold ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-800 border border-rose-500/20">
                        Out of Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};
