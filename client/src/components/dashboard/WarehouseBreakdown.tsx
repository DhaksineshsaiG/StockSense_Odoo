import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse as WarehouseIcon, AlertTriangle, AlertOctagon, Layers, ArrowRight } from 'lucide-react';
import { WarehouseSummary } from '../../types';

interface WarehouseBreakdownProps {
  summary: WarehouseSummary[];
  onSelectWarehouse?: (warehouseId: string) => void;
  selectedWarehouseId?: string;
}

export const WarehouseBreakdown: React.FC<WarehouseBreakdownProps> = ({
  summary,
  onSelectWarehouse,
  selectedWarehouseId,
}) => {
  const navigate = useNavigate();
  const grandTotal = summary.reduce((acc, curr) => acc + curr.totalStock, 0);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between pb-4 border-b border-primary-950/10">
        <div>
          <h3 className="text-base font-bold text-primary-950 tracking-tight flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-primary-900" />
            <span>Multi-Warehouse Distribution</span>
          </h3>
          <p className="text-xs text-primary-800/60 mt-0.5">Physical facility stock distribution & facility health</p>
        </div>

        <button
          onClick={() => navigate('/warehouses')}
          className="text-xs text-primary-900 hover:text-primary-700 flex items-center gap-1 font-semibold transition-colors"
        >
          <span>Manage Facilities</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((item) => {
          const isSelected = selectedWarehouseId === item.warehouse.id;
          const percentage = grandTotal > 0 ? Math.round((item.totalStock / grandTotal) * 100) : 0;

          return (
            <div
              key={item.warehouse.id}
              onClick={() => onSelectWarehouse && onSelectWarehouse(item.warehouse.id)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-primary-950/[0.08] border-primary-950/30 shadow-[0_4px_20px_rgba(74,14,26,0.08)]'
                  : 'bg-white/40 hover:bg-white/70 border-primary-950/8'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-primary-900 bg-primary-950/10 px-2 py-0.5 rounded border border-primary-950/15">
                    {item.warehouse.code}
                  </span>
                  <h4 className="text-sm font-bold text-primary-950 mt-1.5">{item.warehouse.name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-primary-950 font-mono">{item.totalStock}</span>
                  <p className="text-[10px] text-primary-800/60 uppercase">Units</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-primary-800/60 mb-1">
                  <span>Capacity Share</span>
                  <span className="font-semibold text-primary-950">{percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-primary-950/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-950 to-primary-700 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Alerts pill counters & Detail Link */}
              <div className="mt-3 pt-3 border-t border-primary-950/8 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{item.lowStockCount} Low</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{item.outOfStockCount} Out</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/warehouses/${item.warehouse.id}`);
                  }}
                  className="text-[11px] text-primary-900 hover:text-primary-700 font-semibold flex items-center gap-1 transition-colors"
                  title="View Warehouse & Locations"
                >
                  <span>Facility Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
