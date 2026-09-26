import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  History,
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { OperationsNavTabs } from '../../components/operations/OperationsNavTabs';
import { ReceiptModal } from '../../components/operations/ReceiptModal';
import { DeliveryModal } from '../../components/operations/DeliveryModal';
import { TransferModal } from '../../components/operations/TransferModal';
import { AdjustmentModal } from '../../components/operations/AdjustmentModal';

import { dashboardApi } from '../../api/dashboard';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { productsApi } from '../../api/products';
import {
  DashboardData,
  Warehouse,
  Location,
  ProductListItem,
  OperationRecord,
} from '../../types';

export const OperationsHubPage: React.FC = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [dash, whList, locList, prodRes] = await Promise.all([
        dashboardApi.getDashboard(),
        warehouseApi.getWarehouses(),
        locationsApi.getLocations(),
        productsApi.getProducts({ limit: 100 }),
      ]);

      setDashboardData(dash);
      setWarehouses(whList);
      setLocations(locList);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load operations hub data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleReceiptCreated = (record: OperationRecord) => {
    showToast(`Receipt ${record.reference} created successfully.`);
    loadData(true);
    navigate(`/operations/receipts/${record.id}`);
  };

  const handleDeliveryCreated = (record: OperationRecord) => {
    showToast(`Delivery Order ${record.reference} created successfully.`);
    loadData(true);
    navigate(`/operations/deliveries/${record.id}`);
  };

  const handleTransferCreated = (record: OperationRecord) => {
    showToast(`Internal Transfer ${record.reference} created successfully.`);
    loadData(true);
    navigate(`/operations/transfers/${record.id}`);
  };

  const handleAdjustmentCreated = (record: OperationRecord) => {
    showToast(`Inventory Adjustment ${record.reference} created successfully.`);
    loadData(true);
    navigate(`/operations/adjustments/${record.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary-950 tracking-tight">Operations</h1>
            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary-950/10 text-primary-900 border border-primary-950/15">
              Live Hub
            </span>
          </div>
          <p className="text-xs text-primary-800/60 mt-1">
            Manage receipts, deliveries, transfers, and inventory adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="!px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <OperationsNavTabs activeTab="hub" />
        </div>
      </div>

      {/* 4 Operations Core Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Receipts Card */}
        <GlassCard className="p-5 flex flex-col justify-between hover:border-emerald-700/30 transition-all duration-200 group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-600/10 px-2 py-0.5 rounded-md border border-emerald-600/20">
                Inbound
              </span>
            </div>

            <h3 className="text-base font-bold text-primary-950 group-hover:text-emerald-900 transition-colors">
              Incoming Receipts
            </h3>
            <p className="text-xs text-primary-800/65 mt-1 line-clamp-2">
              Receive goods from suppliers and restock internal warehouse bins.
            </p>

            <div className="mt-4 pt-3 border-t border-primary-950/5 flex items-center justify-between text-xs">
              <span className="text-primary-800/60">Pending Validation:</span>
              <span className="font-bold text-primary-950 px-2 py-0.5 rounded bg-primary-950/5">
                {isLoading ? '...' : dashboardData?.pendingReceipts?.count ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-primary-950/10 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              className="flex-1 !text-xs !py-1.5 !bg-emerald-700 hover:!bg-emerald-800 !text-ivory-100"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Receipt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/operations/receipts')}
              className="!px-2.5 !text-xs !py-1.5"
              title="View all receipts"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </GlassCard>

        {/* 2. Deliveries Card */}
        <GlassCard className="p-5 flex flex-col justify-between hover:border-primary-900/30 transition-all duration-200 group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-950 group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-900 bg-primary-950/10 px-2 py-0.5 rounded-md border border-primary-950/20">
                Outbound
              </span>
            </div>

            <h3 className="text-base font-bold text-primary-950 group-hover:text-primary-800 transition-colors">
              Delivery Orders
            </h3>
            <p className="text-xs text-primary-800/65 mt-1 line-clamp-2">
              Fulfill customer shipments with stock reservation and availability checking.
            </p>

            <div className="mt-4 pt-3 border-t border-primary-950/5 flex items-center justify-between text-xs">
              <span className="text-primary-800/60">Pending Dispatch:</span>
              <span className="font-bold text-primary-950 px-2 py-0.5 rounded bg-primary-950/5">
                {isLoading ? '...' : dashboardData?.pendingDeliveries?.count ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-primary-950/10 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDeliveryModalOpen(true)}
              className="flex-1 !text-xs !py-1.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Delivery
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/operations/deliveries')}
              className="!px-2.5 !text-xs !py-1.5"
              title="View all deliveries"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </GlassCard>

        {/* 3. Internal Transfers Card */}
        <GlassCard className="p-5 flex flex-col justify-between hover:border-amber-700/30 transition-all duration-200 group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-800 group-hover:scale-105 transition-transform">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-600/10 px-2 py-0.5 rounded-md border border-amber-600/20">
                Internal
              </span>
            </div>

            <h3 className="text-base font-bold text-primary-950 group-hover:text-amber-900 transition-colors">
              Internal Transfers
            </h3>
            <p className="text-xs text-primary-800/65 mt-1 line-clamp-2">
              Move inventory between storage bins, racks, or staging locations.
            </p>

            <div className="mt-4 pt-3 border-t border-primary-950/5 flex items-center justify-between text-xs">
              <span className="text-primary-800/60">Pending Transfers:</span>
              <span className="font-bold text-primary-950 px-2 py-0.5 rounded bg-primary-950/5">
                {isLoading ? '...' : dashboardData?.internalTransfers?.pendingCount ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-primary-950/10 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex-1 !text-xs !py-1.5 !bg-amber-800 hover:!bg-amber-900 !text-ivory-100"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Transfer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/operations/transfers')}
              className="!px-2.5 !text-xs !py-1.5"
              title="View all transfers"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </GlassCard>

        {/* 4. Inventory Adjustments Card */}
        <GlassCard className="p-5 flex flex-col justify-between hover:border-primary-900/30 transition-all duration-200 group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-900/10 border border-primary-900/20 flex items-center justify-center text-primary-900 group-hover:scale-105 transition-transform">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-900 bg-primary-950/10 px-2 py-0.5 rounded-md border border-primary-950/20">
                Audit
              </span>
            </div>

            <h3 className="text-base font-bold text-primary-950 group-hover:text-primary-800 transition-colors">
              Inventory Adjustments
            </h3>
            <p className="text-xs text-primary-800/65 mt-1 line-clamp-2">
              Conduct cycle counts and reconcile physical quantities with system records.
            </p>

            <div className="mt-4 pt-3 border-t border-primary-950/5 flex items-center justify-between text-xs">
              <span className="text-primary-800/60">Inventory Loss / Gain:</span>
              <span className="font-semibold text-primary-900 text-[11px]">Audit Mode</span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-primary-950/10 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex-1 !text-xs !py-1.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Count
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/operations/adjustments')}
              className="!px-2.5 !text-xs !py-1.5"
              title="View all adjustments"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Pending Operations Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Inbound Receipts */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-primary-950">Pending Receipts Queue</h3>
            </div>
            <button
              onClick={() => navigate('/operations/receipts?status=READY')}
              className="text-xs text-primary-900 hover:text-primary-800 flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-primary-950/5">
            {isLoading ? (
              <div className="py-4 space-y-2">
                <LoadingSkeleton lines={3} />
              </div>
            ) : !dashboardData?.pendingReceipts?.items?.length ? (
              <div className="py-8 text-center text-xs text-primary-800/50">
                No receipts currently waiting for validation.
              </div>
            ) : (
              dashboardData.pendingReceipts.items.slice(0, 5).map((op) => (
                <div
                  key={op.id}
                  onClick={() => navigate(`/operations/receipts/${op.id}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-primary-950/[0.02] px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-950 group-hover:text-emerald-800 transition-colors">
                        {op.reference}
                      </span>
                      <StatusBadge status={op.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-primary-800/60 mt-0.5">
                      {op.partnerName || 'Supplier Delivery'} • {op.warehouse?.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-700">
                      +{op.totalDemandQty} units
                    </span>
                    <div className="text-[10px] text-primary-800/40 mt-0.5 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(op.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Pending Outbound Deliveries */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-primary-950">Pending Deliveries Queue</h3>
            </div>
            <button
              onClick={() => navigate('/operations/deliveries?status=READY')}
              className="text-xs text-primary-900 hover:text-primary-800 flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-primary-950/5">
            {isLoading ? (
              <div className="py-4 space-y-2">
                <LoadingSkeleton lines={3} />
              </div>
            ) : !dashboardData?.pendingDeliveries?.items?.length ? (
              <div className="py-8 text-center text-xs text-primary-800/50">
                No delivery orders awaiting packing or dispatch.
              </div>
            ) : (
              dashboardData.pendingDeliveries.items.slice(0, 5).map((op) => (
                <div
                  key={op.id}
                  onClick={() => navigate(`/operations/deliveries/${op.id}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-primary-950/[0.02] px-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-950 group-hover:text-primary-800 transition-colors">
                        {op.reference}
                      </span>
                      <StatusBadge status={op.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-primary-800/60 mt-0.5">
                      {op.partnerName || 'Customer Shipment'} • {op.warehouse?.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-primary-900">
                      {op.totalDemandQty} units
                    </span>
                    <div className="text-[10px] text-primary-800/40 mt-0.5 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(op.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Recent Stock Movement Audit History */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary-900" />
            <h3 className="text-sm font-bold text-primary-950">Recent Operations & Stock Moves</h3>
          </div>
          <button
            onClick={() => navigate('/ledger')}
            className="text-xs text-primary-900 hover:text-primary-800 flex items-center gap-1 font-medium"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          {isLoading ? (
            <div className="py-6">
              <LoadingSkeleton lines={4} />
            </div>
          ) : !dashboardData?.recentActivity?.length ? (
            <div className="py-10 text-center text-xs text-primary-800/50">
              No recent stock moves recorded in ledger.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px] bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3 font-semibold">Reference</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                  <th className="py-2.5 px-3 font-semibold">From → To Location</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-primary-950">
                {dashboardData.recentActivity.slice(0, 6).map((move) => (
                  <tr
                    key={move.id}
                    onClick={() => navigate(`/ledger/${move.id}`)}
                    className="hover:bg-primary-950/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-medium text-primary-950 hover:text-primary-800 transition-colors">
                      {move.reference || move.operation?.reference || 'MOVE'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary-950/5 text-primary-900 border border-primary-950/10">
                        {move.operationType || 'MOVE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-primary-950">{move.product?.name}</span>
                      <span className="text-[10px] text-primary-800/60 block">{move.product?.sku}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary-950">
                      {move.quantity} {move.product?.uom || 'Units'}
                    </td>
                    <td className="py-2.5 px-3 text-primary-800/60 text-[11px]">
                      {move.fromLocation?.name || 'External'} → {move.toLocation?.name || 'External'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-primary-800/40 text-[11px]">
                      {new Date(move.date).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* Creation Modals */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSuccess={handleReceiptCreated}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      <DeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        onSuccess={handleDeliveryCreated}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={handleTransferCreated}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={handleAdjustmentCreated}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />
    </div>
  );
};

export default OperationsHubPage;
