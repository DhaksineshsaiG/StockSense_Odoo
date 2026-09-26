import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, History, Clock } from 'lucide-react';
import { StockMove } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';

interface RecentActivityFeedProps {
  moves: StockMove[];
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ moves }) => {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between pb-4 border-b border-primary-950/10">
        <div>
          <h3 className="text-base font-bold text-primary-950 tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-primary-900" />
            <span>Audit Move Activity</span>
          </h3>
          <p className="text-xs text-primary-800/60 mt-0.5">
            Immutable double-entry stock movement journal
          </p>
        </div>

        <button
          onClick={() => navigate('/ledger')}
          className="text-xs text-primary-900 hover:text-primary-700 flex items-center gap-1 font-semibold transition-colors"
        >
          <span>View Full Ledger</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-4">
        {moves.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-6 h-6 text-primary-800/40" />}
            title="No activity recorded yet"
            description="Stock movements generated through receipts, deliveries, transfers, or adjustments will be logged here."
            className="py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Reference / Time</th>
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Transfer Path</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-center">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {moves.map((move) => (
                  <tr
                    key={move.id}
                    onClick={() => navigate(`/ledger/${move.id}`)}
                    className="hover:bg-primary-950/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-primary-950">{move.reference}</div>
                      <div className="text-[11px] text-primary-800/60 mt-0.5">
                        {new Date(move.date).toLocaleDateString()} {new Date(move.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-primary-950">{move.product.name}</div>
                      <div className="text-[11px] text-primary-800/50 font-mono mt-0.5">{move.product.sku}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-primary-900">
                        <span className="font-medium text-primary-800/70">
                          {move.fromLocation?.name || 'External'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-primary-800/40 flex-shrink-0" />
                        <span className="font-medium text-primary-950">
                          {move.toLocation?.name || 'External'}
                        </span>
                      </div>
                      {move.warehouse && (
                        <div className="text-[10px] text-primary-800/50 mt-0.5">
                          {move.warehouse.name} ({move.warehouse.code})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-bold text-sm text-emerald-700">
                        {move.quantity}
                      </span>{' '}
                      <span className="text-[10px] text-primary-800/60 font-normal">{move.product.uom || 'Units'}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={move.state} />
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
