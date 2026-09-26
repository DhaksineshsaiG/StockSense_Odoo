import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';
import { warehouseApi } from '../../api/warehouses';
import { DashboardData, Warehouse } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { StockAlertTable } from '../../components/dashboard/StockAlertTable';
import { PendingOperationsList } from '../../components/dashboard/PendingOperationsList';
import { RecentActivityFeed } from '../../components/dashboard/RecentActivityFeed';
import { WarehouseBreakdown } from '../../components/dashboard/WarehouseBreakdown';
import { KpiCardSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Button } from '../../components/common/Button';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load warehouse list once for the filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function fetchWarehouses() {
      try {
        const whs = await warehouseApi.getWarehouses();
        if (isMounted) {
          setWarehouses(whs || []);
        }
      } catch (err) {
        console.error('Failed to fetch warehouses for filter dropdown:', err);
      }
    }
    fetchWarehouses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const data = await dashboardApi.getDashboard({
          warehouseId: selectedWarehouseId || undefined,
        });
        setDashboardData(data);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to connect to StockSense inventory service.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedWarehouseId]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (error && !dashboardData) {
    return (
      <div className="py-12">
        <ErrorState
          title="Dashboard Unavailable"
          message={error}
          onRetry={() => fetchDashboard(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Warehouse Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary-950 tracking-tight">
              Hello, {user?.name || 'Inventory Specialist'}
            </h2>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary-950/10 text-primary-900 border border-primary-950/15">
              {user?.role || 'STAFF'}
            </span>
          </div>
          <p className="text-xs text-primary-800/60 mt-1">
            Real-time multi-location inventory metrics powered by Neon PostgreSQL
          </p>
        </div>

        {/* Warehouse Selector & Manual Refresh Button */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="relative flex items-center">
            <Building2 className="w-4 h-4 text-primary-800/50 absolute left-3 pointer-events-none" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="glass-input text-xs rounded-xl pl-9 pr-8 py-2 text-primary-950 cursor-pointer appearance-none border border-primary-950/10 hover:border-primary-950/20 focus:border-primary-800"
              aria-label="Filter by warehouse"
            >
              <option value="" className="bg-ivory-100 text-primary-950">
                All Warehouses (Global)
              </option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id} className="bg-ivory-100 text-primary-950">
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDashboard(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="rounded-xl px-3 py-2 text-xs"
          >
            Sync
          </Button>
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Total Stock"
            value={dashboardData.kpis.totalStock}
            subtitle="Units"
            icon={<Package className="w-5 h-5 text-primary-900" />}
            glow="primary"
            trend={{ label: 'Physical On-Hand', isPositive: true }}
          />

          <KpiCard
            title="Low Stock"
            value={dashboardData.kpis.lowStock}
            subtitle="Items"
            icon={<AlertTriangle className="w-5 h-5 text-amber-700" />}
            glow="amber"
            trend={{ label: 'Below Min Reorder', isPositive: false }}
          />

          <KpiCard
            title="Out of Stock"
            value={dashboardData.kpis.outOfStock}
            subtitle="Items"
            icon={<AlertOctagon className="w-5 h-5 text-rose-700" />}
            glow="rose"
            trend={{ label: 'Critical Deficit', isPositive: false }}
          />

          <KpiCard
            title="Receipts"
            value={dashboardData.kpis.pendingReceipts}
            subtitle="Pending"
            icon={<ArrowDownLeft className="w-5 h-5 text-emerald-700" />}
            glow="emerald"
            trend={{ label: 'Incoming Vendor', isPositive: true }}
          />

          <KpiCard
            title="Deliveries"
            value={dashboardData.kpis.pendingDeliveries}
            subtitle="Pending"
            icon={<ArrowUpRight className="w-5 h-5 text-primary-900" />}
            glow="primary"
            trend={{ label: 'Outgoing Customer', isPositive: true }}
          />

          <KpiCard
            title="Transfers"
            value={dashboardData.kpis.internalTransfers}
            subtitle="Pending"
            icon={<ArrowLeftRight className="w-5 h-5 text-primary-900" />}
            glow="primary"
            trend={{ label: 'Inter-Location', isPositive: true }}
          />
        </div>
      ) : null}

      {/* Multi-Warehouse Distribution Section */}
      {dashboardData && dashboardData.warehouseSummary && dashboardData.warehouseSummary.length > 0 && (
        <WarehouseBreakdown
          summary={dashboardData.warehouseSummary}
          selectedWarehouseId={selectedWarehouseId}
          onSelectWarehouse={(whId) => {
            setSelectedWarehouseId((prev) => (prev === whId ? '' : whId));
          }}
        />
      )}

      {/* Stock Health Alerts (Low Stock + Out of Stock) */}
      {dashboardData && (
        <StockAlertTable
          lowStockItems={dashboardData.lowStock.items}
          outOfStockItems={dashboardData.outOfStock.items}
        />
      )}

      {/* Operations Queue (Receipts, Deliveries, Transfers) */}
      {dashboardData && (
        <PendingOperationsList
          receipts={dashboardData.pendingReceipts.items}
          deliveries={dashboardData.pendingDeliveries.items}
          transfers={dashboardData.internalTransfers.items}
        />
      )}

      {/* Recent Activity Audit Moves */}
      {dashboardData && (
        <RecentActivityFeed moves={dashboardData.recentActivity} />
      )}
    </div>
  );
};
