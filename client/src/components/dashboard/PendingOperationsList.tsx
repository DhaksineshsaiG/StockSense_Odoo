import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar, User, Package } from 'lucide-react';
import { DashboardOperationSummary } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';

interface PendingOperationsListProps {
  receipts: DashboardOperationSummary[];
  deliveries: DashboardOperationSummary[];
  transfers: DashboardOperationSummary[];
}

export const PendingOperationsList: React.FC<PendingOperationsListProps> = ({
  receipts,
  deliveries,
  transfers,
}) => {
  const [activeTab, setActiveTab] = useState<'receipts' | 'deliveries' | 'transfers'>('receipts');

  const getActiveList = () => {
    switch (activeTab) {
      case 'receipts':
        return { items: receipts, title: 'Pending Receipts', type: 'RECEIPT' };
      case 'deliveries':
        return { items: deliveries, title: 'Pending Delivery Orders', type: 'DELIVERY' };
      case 'transfers':
        return { items: transfers, title: 'Pending Internal Transfers', type: 'INTERNAL_TRANSFER' };
    }
  };

  const { items, title } = getActiveList();

  return (
    <div className="glass-card p-5">
      {/* Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-primary-950/10">
        <div>
          <h3 className="text-base font-bold text-primary-950 tracking-tight">Active Operation Queues</h3>
          <p className="text-xs text-primary-800/60 mt-0.5">Shipments and transfers waiting or ready for processing</p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-primary-950/[0.05] border border-primary-950/10 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'receipts'
                ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/25'
                : 'text-primary-800/60 hover:text-primary-950'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receipts</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[10px] text-emerald-800 font-bold">
              {receipts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'deliveries'
                ? 'bg-primary-950/10 text-primary-950 border border-primary-950/20'
                : 'text-primary-800/60 hover:text-primary-950'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Deliveries</span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary-950/10 text-[10px] text-primary-900 font-bold">
              {deliveries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'transfers'
                ? 'bg-primary-950/10 text-primary-950 border border-primary-950/20'
                : 'text-primary-800/60 hover:text-primary-950'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary-950/10 text-[10px] text-primary-900 font-bold">
              {transfers.length}
            </span>
          </button>
        </div>
      </div>

      {/* List / Table */}
      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            title={`No ${title.toLowerCase()} in queue`}
            description="All scheduled operations for this queue are completed or up to date."
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Warehouse / Partner</th>
                  <th className="py-2.5 px-3">Scheduled / Created</th>
                  <th className="py-2.5 px-3 text-right">Items & Demand</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {items.map((op) => (
                  <tr key={op.id} className="hover:bg-primary-950/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-primary-950 tracking-wider">{op.reference}</span>
                      {op.responsible && (
                        <div className="flex items-center gap-1 text-[11px] text-primary-800/60 mt-0.5">
                          <User className="w-3 h-3 text-primary-800/40" />
                          <span>{op.responsible.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-primary-950">
                        {op.warehouse.name} ({op.warehouse.code})
                      </div>
                      {op.partnerName && (
                        <div className="text-[11px] text-primary-800/60 mt-0.5">
                          Partner: <span className="text-primary-900">{op.partnerName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-primary-900 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary-800/40" />
                        <span>
                          {op.scheduledDate
                            ? new Date(op.scheduledDate).toLocaleDateString()
                            : new Date(op.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-primary-800/50 mt-0.5">
                        {new Date(op.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 font-mono font-semibold text-primary-950">
                        <Package className="w-3.5 h-3.5 text-primary-900" />
                        <span>{op.itemCount} item(s)</span>
                      </div>
                      <div className="text-[11px] text-primary-800/60 font-mono mt-0.5">
                        Total Demand: <span className="text-primary-950 font-semibold">{op.totalDemandQty}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={op.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
