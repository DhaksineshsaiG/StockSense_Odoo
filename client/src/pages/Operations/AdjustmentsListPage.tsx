import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Equal,
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
import { AdjustmentModal } from '../../components/operations/AdjustmentModal';

import { adjustmentsApi } from '../../api/operations';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { productsApi } from '../../api/products';
import {
  OperationRecord,
  Warehouse,
  Location,
  ProductListItem,
} from '../../types';

export const AdjustmentsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [adjustments, setAdjustments] = useState<OperationRecord[]>([]);
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
  const [validatingAdjustment, setValidatingAdjustment] = useState<OperationRecord | null>(null);
  const [cancelingAdjustment, setCancelingAdjustment] = useState<OperationRecord | null>(null);
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

  const fetchAdjustments = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const offset = (page - 1) * pageSize;
        const res = await adjustmentsApi.getAdjustments({
          status: statusFilter || undefined,
          warehouseId: warehouseFilter || undefined,
          search: searchTerm.trim() || undefined,
          limit: pageSize,
          offset,
        });

        setAdjustments(res.adjustments || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error('Failed to fetch adjustments list:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, statusFilter, warehouseFilter, searchTerm, pageSize]
  );

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAdjustments();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setWarehouseFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  // Validate Adjustment
  const handleConfirmValidate = async () => {
    if (!validatingAdjustment) return;
    setIsActionLoading(true);
    try {
      await adjustmentsApi.validateAdjustment(validatingAdjustment.id);
      showToast(`Adjustment ${validatingAdjustment.reference} validated. Stock reconciled.`);
      setValidatingAdjustment(null);
      fetchAdjustments(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate adjustment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Adjustment
  const handleConfirmCancel = async () => {
    if (!cancelingAdjustment) return;
    setIsActionLoading(true);
    try {
      await adjustmentsApi.cancelAdjustment(cancelingAdjustment.id);
      showToast(`Adjustment ${cancelingAdjustment.reference} canceled.`);
      setCancelingAdjustment(null);
      fetchAdjustments(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel adjustment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-950 tracking-tight">Inventory Adjustments</h1>
              <p className="text-xs text-primary-800/60">
                Perform cycle counts and reconcile physical quantities with system records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OperationsNavTabs activeTab="adjustments" />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Adjustment
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
              placeholder="Search reference, audit notes..."
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
              onClick={() => fetchAdjustments(true)}
              disabled={isRefreshing}
              className="!py-2"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Adjustments Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 bg-primary-950/[0.02] text-primary-800/60 text-[11px]">
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Product(s)</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold text-center">Recorded</th>
                <th className="py-3 px-4 font-semibold text-center">Physical</th>
                <th className="py-3 px-4 font-semibold text-center">Difference</th>
                <th className="py-3 px-4 font-semibold">Warehouse</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-950/5 text-primary-950">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 px-4">
                    <LoadingSkeleton lines={4} />
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    <EmptyState
                      title="No inventory adjustments found"
                      description={
                        searchTerm || statusFilter || warehouseFilter
                          ? 'Try adjusting your filters.'
                          : 'Create an inventory adjustment to reconcile recorded stock with physical count.'
                      }
                      action={
                        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                          New Adjustment
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => {
                  const firstItem = adj.items?.[0];
                  const recorded = firstItem?.recordedQuantity ?? firstItem?.doneQty ?? 0;
                  const physical = firstItem?.physicalQuantity ?? firstItem?.demandQty ?? 0;
                  const diff = firstItem?.difference ?? physical - recorded;
                  const itemsCount = adj.items?.length || 1;

                  return (
                    <tr
                      key={adj.id}
                      onClick={() => navigate(`/operations/adjustments/${adj.id}`)}
                      className="hover:bg-primary-950/[0.02] transition-colors cursor-pointer group"
                    >
                      {/* Reference */}
                      <td className="py-3 px-4 font-semibold text-primary-950 group-hover:text-primary-800 transition-colors">
                        {adj.reference}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={adj.status} size="sm" />
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4">
                        {firstItem?.product ? (
                          <div>
                            <span className="font-semibold text-primary-950">
                              {firstItem.product.name}
                            </span>
                            {itemsCount > 1 && (
                              <span className="text-[10px] text-primary-800/70 ml-1.5 px-1.5 py-0.5 rounded bg-primary-950/5 border border-primary-950/10">
                                +{itemsCount - 1} more
                              </span>
                            )}
                            <div className="text-[10px] text-primary-800/50 font-mono">
                              {firstItem.product.sku}
                            </div>
                          </div>
                        ) : (
                          <span className="text-primary-800/40 italic">No products</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-primary-800/75">
                        {adj.destLocation?.name || adj.sourceLocation?.name || 'Stock Location'}
                      </td>

                      {/* Recorded Qty */}
                      <td className="py-3 px-4 text-center font-medium text-primary-800/70">
                        {recorded}
                      </td>

                      {/* Physical Qty */}
                      <td className="py-3 px-4 text-center font-bold text-primary-950">
                        {physical}
                      </td>

                      {/* Difference */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            diff > 0
                              ? 'bg-emerald-600/10 text-emerald-800 border-emerald-600/20'
                              : diff < 0
                              ? 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                              : 'bg-primary-950/5 text-primary-800/60 border-primary-950/10'
                          }`}
                        >
                          {diff > 0 ? (
                            <>
                              <ArrowUp className="w-3 h-3" /> +{diff}
                            </>
                          ) : diff < 0 ? (
                            <>
                              <ArrowDown className="w-3 h-3" /> {diff}
                            </>
                          ) : (
                            <>
                              <Equal className="w-3 h-3" /> 0
                            </>
                          )}
                        </span>
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-primary-950/5 border border-primary-950/10 text-[11px] font-medium text-primary-900">
                          {adj.warehouse?.code}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-primary-800/50 text-[11px]">
                        {adj.scheduledDate
                          ? new Date(adj.scheduledDate).toLocaleDateString()
                          : new Date(adj.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/operations/adjustments/${adj.id}`)}
                            className="p-1.5 rounded-lg text-primary-800/50 hover:text-primary-950 hover:bg-primary-950/5 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {adj.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => setValidatingAdjustment(adj)}
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-600/10 transition-colors"
                              title="Validate adjustment"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {adj.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => setCancelingAdjustment(adj)}
                              className="p-1.5 rounded-lg text-primary-800/40 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Cancel adjustment"
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
      <AdjustmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(adj) => {
          showToast(`Adjustment ${adj.reference} created successfully.`);
          fetchAdjustments(true);
          navigate(`/operations/adjustments/${adj.id}`);
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      {/* Validation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(validatingAdjustment)}
        onClose={() => setValidatingAdjustment(null)}
        onConfirm={handleConfirmValidate}
        title={`Validate Adjustment ${validatingAdjustment?.reference}`}
        message="Validating this adjustment will update the recorded StockQuant to match the physical count and create an inventory adjustment StockMove in the ledger. This action is irreversible."
        confirmText="Validate & Reconcile Stock"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelingAdjustment)}
        onClose={() => setCancelingAdjustment(null)}
        onConfirm={handleConfirmCancel}
        title={`Cancel Adjustment ${cancelingAdjustment?.reference}`}
        message="Are you sure you want to cancel this adjustment? The physical count audit will be canceled without adjusting stock quantities."
        confirmText="Cancel Adjustment"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default AdjustmentsListPage;
