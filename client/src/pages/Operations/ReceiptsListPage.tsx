import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { OperationsNavTabs } from '../../components/operations/OperationsNavTabs';
import { ReceiptModal } from '../../components/operations/ReceiptModal';

import { receiptsApi } from '../../api/operations';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { productsApi } from '../../api/products';
import {
  OperationRecord,
  Warehouse,
  Location,
  ProductListItem,
} from '../../types';

export const ReceiptsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState<OperationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Action Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [validatingReceipt, setValidatingReceipt] = useState<OperationRecord | null>(null);
  const [cancelingReceipt, setCancelingReceipt] = useState<OperationRecord | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial lookup data
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [whList, locList, prodRes] = await Promise.all([
          warehouseApi.getWarehouses(),
          locationsApi.getLocations(),
          productsApi.getProducts({ limit: 100 }),
        ]);
        setWarehouses(whList);
        setLocations(locList);
        setProducts(prodRes.data || []);
      } catch (err) {
        console.error('Failed to load lookup metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch receipts list
  const fetchReceipts = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const offset = (page - 1) * pageSize;
        const res = await receiptsApi.getReceipts({
          status: statusFilter || undefined,
          warehouseId: warehouseFilter || undefined,
          search: searchTerm.trim() || undefined,
          limit: pageSize,
          offset,
        });

        setReceipts(res.receipts || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error('Failed to fetch receipts list:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, statusFilter, warehouseFilter, searchTerm, pageSize]
  );

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setWarehouseFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  // Validate Receipt action
  const handleConfirmValidate = async () => {
    if (!validatingReceipt) return;
    setIsActionLoading(true);
    try {
      await receiptsApi.validateReceipt(validatingReceipt.id);
      showToast(`Receipt ${validatingReceipt.reference} validated. Stock updated.`);
      setValidatingReceipt(null);
      fetchReceipts(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate receipt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Receipt action
  const handleConfirmCancel = async () => {
    if (!cancelingReceipt) return;
    setIsActionLoading(true);
    try {
      await receiptsApi.cancelReceipt(cancelingReceipt.id);
      showToast(`Receipt ${cancelingReceipt.reference} canceled.`);
      setCancelingReceipt(null);
      fetchReceipts(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel receipt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-950 tracking-tight">Incoming Receipts</h1>
              <p className="text-xs text-primary-800/60">
                Process inbound purchase orders and restock warehouse inventory
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OperationsNavTabs activeTab="receipts" />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="!bg-emerald-700 hover:!bg-emerald-800 !text-ivory-100 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Receipt
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <GlassCard className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-800/40" />
            <input
              type="text"
              placeholder="Search reference, partner/vendor, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-ivory-100/80 border border-primary-950/15 text-primary-950 placeholder-primary-800/40 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'READY', label: 'Ready' },
                { value: 'DONE', label: 'Done' },
                { value: 'CANCELED', label: 'Canceled' },
              ]}
            />
          </div>

          {/* Warehouse Filter */}
          <div className="w-full sm:w-48">
            <Select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
              ]}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" size="sm" className="!py-2">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filter
            </Button>

            {(searchTerm || statusFilter || warehouseFilter) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                className="!py-2 !text-primary-800/60 hover:!text-primary-950"
                title="Clear filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fetchReceipts(true)}
              disabled={isRefreshing}
              className="!py-2"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Receipts Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 bg-primary-950/[0.02] text-primary-800/60 text-[11px]">
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Vendor / Partner</th>
                <th className="py-3 px-4 font-semibold">Products / Demand</th>
                <th className="py-3 px-4 font-semibold">Destination</th>
                <th className="py-3 px-4 font-semibold">Warehouse</th>
                <th className="py-3 px-4 font-semibold">Scheduled Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-950/5 text-primary-950">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 px-4">
                    <LoadingSkeleton lines={4} />
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <EmptyState
                      title="No incoming receipts found"
                      description={
                        searchTerm || statusFilter || warehouseFilter
                          ? 'Try adjusting your filters to find receipts.'
                          : 'Create your first receipt to receive inventory from suppliers.'
                      }
                      action={
                        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                          Create Receipt
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                receipts.map((rcpt) => {
                  const itemsCount = rcpt.items?.length ?? rcpt._count?.items ?? 0;
                  const totalDemand = rcpt.items?.reduce((sum, it) => sum + it.demandQty, 0) ?? 0;
                  const firstItem = rcpt.items?.[0];

                  return (
                    <tr
                      key={rcpt.id}
                      onClick={() => navigate(`/operations/receipts/${rcpt.id}`)}
                      className="hover:bg-primary-950/[0.02] transition-colors cursor-pointer group"
                    >
                      {/* Reference */}
                      <td className="py-3 px-4 font-semibold text-primary-950 group-hover:text-primary-800 transition-colors">
                        {rcpt.reference}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={rcpt.status} size="sm" />
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4 font-medium text-primary-950">
                        {rcpt.partnerName || <span className="text-primary-800/40 italic">No vendor specified</span>}
                      </td>

                      {/* Products */}
                      <td className="py-3 px-4">
                        {itemsCount > 0 ? (
                          <div>
                            <span className="font-semibold text-primary-950">
                              {firstItem?.product?.name || `${itemsCount} item(s)`}
                            </span>
                            {itemsCount > 1 && (
                              <span className="text-[10px] text-primary-800/70 ml-1.5 px-1.5 py-0.5 rounded bg-primary-950/5 border border-primary-950/10">
                                +{itemsCount - 1} more
                              </span>
                            )}
                            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                              {totalDemand} total units
                            </div>
                          </div>
                        ) : (
                          <span className="text-primary-800/40">0 items</span>
                        )}
                      </td>

                      {/* Destination */}
                      <td className="py-3 px-4 text-primary-800/75">
                        {rcpt.destLocation?.name || 'Default Stock'}
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-primary-950/5 border border-primary-950/10 text-[11px] font-medium text-primary-900">
                          {rcpt.warehouse?.code}
                        </span>
                      </td>

                      {/* Scheduled Date */}
                      <td className="py-3 px-4 text-primary-800/50 text-[11px]">
                        {rcpt.scheduledDate
                          ? new Date(rcpt.scheduledDate).toLocaleDateString()
                          : new Date(rcpt.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/operations/receipts/${rcpt.id}`)}
                            className="p-1.5 rounded-lg text-primary-800/50 hover:text-primary-950 hover:bg-primary-950/5 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(rcpt.status === 'DRAFT' || rcpt.status === 'READY') && (
                            <button
                              type="button"
                              onClick={() => setValidatingReceipt(rcpt)}
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-600/10 transition-colors"
                              title="Validate receipt"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {(rcpt.status === 'DRAFT' || rcpt.status === 'READY') && (
                            <button
                              type="button"
                              onClick={() => setCancelingReceipt(rcpt)}
                              className="p-1.5 rounded-lg text-primary-800/40 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Cancel receipt"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </GlassCard>

      {/* Creation Modal */}
      <ReceiptModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(rec) => {
          showToast(`Receipt ${rec.reference} created successfully.`);
          fetchReceipts(true);
          navigate(`/operations/receipts/${rec.id}`);
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      {/* Validation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(validatingReceipt)}
        onClose={() => setValidatingReceipt(null)}
        onConfirm={handleConfirmValidate}
        title={`Validate Receipt ${validatingReceipt?.reference}`}
        message="Validating this receipt will commit incoming stock into warehouse inventory, generate double-entry stock ledger entries, and mark the operation as DONE."
        confirmText="Validate & Receive Stock"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelingReceipt)}
        onClose={() => setCancelingReceipt(null)}
        onConfirm={handleConfirmCancel}
        title={`Cancel Receipt ${cancelingReceipt?.reference}`}
        message="Are you sure you want to cancel this receipt? It has not been completed, so no stock will be added to inventory."
        confirmText="Cancel Receipt"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default ReceiptsListPage;
