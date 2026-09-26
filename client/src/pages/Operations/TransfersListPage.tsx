import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
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
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { OperationsNavTabs } from '../../components/operations/OperationsNavTabs';
import { TransferModal } from '../../components/operations/TransferModal';

import { transfersApi } from '../../api/operations';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { productsApi } from '../../api/products';
import {
  OperationRecord,
  Warehouse,
  Location,
  ProductListItem,
} from '../../types';

export const TransfersListPage: React.FC = () => {
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState<OperationRecord[]>([]);
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
  const [validatingTransfer, setValidatingTransfer] = useState<OperationRecord | null>(null);
  const [cancelingTransfer, setCancelingTransfer] = useState<OperationRecord | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const fetchTransfers = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const offset = (page - 1) * pageSize;
        const res = await transfersApi.getTransfers({
          status: statusFilter || undefined,
          warehouseId: warehouseFilter || undefined,
          search: searchTerm.trim() || undefined,
          limit: pageSize,
          offset,
        });

        setTransfers(res.transfers || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error('Failed to fetch transfers list:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, statusFilter, warehouseFilter, searchTerm, pageSize]
  );

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransfers();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setWarehouseFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  // Validate Transfer
  const handleConfirmValidate = async () => {
    if (!validatingTransfer) return;
    setIsActionLoading(true);
    try {
      await transfersApi.validateTransfer(validatingTransfer.id);
      showToast(`Transfer ${validatingTransfer.reference} validated. Stock moved.`);
      setValidatingTransfer(null);
      fetchTransfers(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate internal transfer.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Transfer
  const handleConfirmCancel = async () => {
    if (!cancelingTransfer) return;
    setIsActionLoading(true);
    try {
      await transfersApi.cancelTransfer(cancelingTransfer.id);
      showToast(`Transfer ${cancelingTransfer.reference} canceled.`);
      setCancelingTransfer(null);
      fetchTransfers(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel transfer.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-primary-950/90 border border-primary-900 text-ivory-100 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-800">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-950 tracking-tight">Internal Transfers</h1>
              <p className="text-xs text-primary-800/60">
                Move inventory between locations, bins, or racks within the warehouse
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OperationsNavTabs activeTab="transfers" />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="!bg-amber-800 hover:!bg-amber-900 !text-ivory-100 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Transfer
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
              placeholder="Search reference, notes..."
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
              onClick={() => fetchTransfers(true)}
              disabled={isRefreshing}
              className="!py-2"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Transfers Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 bg-primary-950/[0.02] text-primary-800/60 text-[11px]">
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Products / Quantity</th>
                <th className="py-3 px-4 font-semibold">Source Location</th>
                <th className="py-3 px-4 font-semibold">Destination Location</th>
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
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <EmptyState
                      title="No internal transfers found"
                      description={
                        searchTerm || statusFilter || warehouseFilter
                          ? 'Try adjusting your filters.'
                          : 'Create an internal transfer to relocate stock between locations.'
                      }
                      action={
                        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                          Create Transfer
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => {
                  const itemsCount = tr.items?.length ?? tr._count?.items ?? 0;
                  const totalDemand = tr.items?.reduce((sum, it) => sum + it.demandQty, 0) ?? 0;
                  const firstItem = tr.items?.[0];

                  return (
                    <tr
                      key={tr.id}
                      onClick={() => navigate(`/operations/transfers/${tr.id}`)}
                      className="hover:bg-primary-950/[0.02] transition-colors cursor-pointer group"
                    >
                      {/* Reference */}
                      <td className="py-3 px-4 font-semibold text-primary-950 group-hover:text-amber-800 transition-colors">
                        {tr.reference}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={tr.status} size="sm" />
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
                            <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                              {totalDemand} total units
                            </div>
                          </div>
                        ) : (
                          <span className="text-primary-800/40">0 items</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-primary-800/75">
                        {tr.sourceLocation?.name || 'Source Location'}
                      </td>

                      {/* Destination */}
                      <td className="py-3 px-4 text-primary-800/75">
                        {tr.destLocation?.name || 'Destination Location'}
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-primary-950/5 border border-primary-950/10 text-[11px] font-medium text-primary-900">
                          {tr.warehouse?.code}
                        </span>
                      </td>

                      {/* Scheduled Date */}
                      <td className="py-3 px-4 text-primary-800/50 text-[11px]">
                        {tr.scheduledDate
                          ? new Date(tr.scheduledDate).toLocaleDateString()
                          : new Date(tr.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/operations/transfers/${tr.id}`)}
                            className="p-1.5 rounded-lg text-primary-800/50 hover:text-primary-950 hover:bg-primary-950/5 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(tr.status === 'DRAFT' || tr.status === 'READY') && (
                            <button
                              type="button"
                              onClick={() => setValidatingTransfer(tr)}
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-600/10 transition-colors"
                              title="Validate transfer"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {(tr.status === 'DRAFT' || tr.status === 'READY') && (
                            <button
                              type="button"
                              onClick={() => setCancelingTransfer(tr)}
                              className="p-1.5 rounded-lg text-primary-800/40 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Cancel transfer"
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
      <TransferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(tr) => {
          showToast(`Internal Transfer ${tr.reference} created successfully.`);
          fetchTransfers(true);
          navigate(`/operations/transfers/${tr.id}`);
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      {/* Validation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(validatingTransfer)}
        onClose={() => setValidatingTransfer(null)}
        onConfirm={handleConfirmValidate}
        title={`Validate Transfer ${validatingTransfer?.reference}`}
        message="Validating will move stock from the Source Location to the Destination Location, record double-entry moves in the ledger, and mark the transfer as DONE. Total warehouse inventory is unchanged."
        confirmText="Validate & Move Stock"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelingTransfer)}
        onClose={() => setCancelingTransfer(null)}
        onConfirm={handleConfirmCancel}
        title={`Cancel Transfer ${cancelingTransfer?.reference}`}
        message="Are you sure you want to cancel this internal transfer? It has not been validated, so no stock will be relocated."
        confirmText="Cancel Transfer"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default TransfersListPage;
