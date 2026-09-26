import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  Layers,
  ArrowRight,
  Edit2,
  Trash2,
  Building2,
  Box,
  Hash,
  X,
  ShieldAlert,
} from 'lucide-react';

import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { WarehouseModal } from '../../components/warehouses/WarehouseModal';

import { warehouseApi } from '../../api/warehouses';
import { useAuth } from '../../contexts/AuthContext';
import { Warehouse } from '../../types';

export const WarehousesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  // State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals & Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / Conflict alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load warehouses from real backend
  const fetchWarehouses = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const res = await warehouseApi.getWarehousesPaged({
          search: debouncedSearch.trim() || undefined,
          page,
          limit: pageSize,
        });

        setWarehouses(res.data || []);
        setTotal(res.pagination?.total || 0);
      } catch (err: any) {
        console.error('Failed to load warehouses:', err);
        setError(err?.response?.data?.message || 'Unable to load warehouses.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, debouncedSearch, pageSize]
  );

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Handle warehouse deletion
  const handleDeleteConfirm = async () => {
    if (!warehouseToDelete) return;
    setIsDeleting(true);

    try {
      const res = await warehouseApi.deleteWarehouse(warehouseToDelete.id);
      showToast(res.message || `Warehouse ${warehouseToDelete.name} deleted successfully.`);
      setWarehouseToDelete(null);
      fetchWarehouses(true);
    } catch (err: any) {
      console.error('Failed to delete warehouse:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete warehouse.';
      showError(msg);
      setWarehouseToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-primary-950 border border-primary-800/40 text-ivory-100 text-xs font-semibold shadow-2xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Error / Conflict Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Deletion Blocked: </span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900 shadow-sm">
            <WarehouseIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-950 tracking-tight">Warehouses</h1>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Manage storage facilities and their inventory locations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchWarehouses(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Warehouse
            </Button>
          )}
        </div>
      </div>

      {/* Search Toolbar */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search warehouses by name, code, address..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
              className="py-2 text-xs"
            />
          </div>

          <div className="text-xs text-primary-800/60 self-end sm:self-center">
            Total Warehouses: <span className="font-semibold text-primary-950">{total}</span>
          </div>
        </div>
      </GlassCard>

      {/* Warehouses Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i} className="p-5 space-y-4">
              <LoadingSkeleton lines={4} />
            </GlassCard>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="p-8">
          <ErrorState
            title="Unable to load warehouses."
            message={error}
            onRetry={() => fetchWarehouses(true)}
          />
        </GlassCard>
      ) : warehouses.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState
            icon={<WarehouseIcon className="w-8 h-8 text-primary-800/40" />}
            title="No warehouses found."
            description={
              searchTerm.trim()
                ? 'No warehouse matched your search query.'
                : 'Get started by creating your first storage facility or logistics hub.'
            }
            action={
              isManager && !searchTerm.trim() ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Warehouse
                </Button>
              ) : undefined
            }
          />
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {/* Warehouse Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouses.map((wh) => (
              <GlassCard
                key={wh.id}
                className="p-5 flex flex-col justify-between hover:border-primary-950/30 transition-all duration-200 group"
              >
                <div>
                  {/* Card Header: Code & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-primary-900 bg-primary-950/10 px-2 py-0.5 rounded border border-primary-950/20">
                      {wh.code}
                    </span>

                    {/* Quick Edit/Delete buttons (Manager Only) */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {isManager && (
                        <>
                          <button
                            type="button"
                            onClick={() => setWarehouseToEdit(wh)}
                            className="p-1.5 rounded-lg text-primary-800/60 hover:text-primary-950 hover:bg-ivory-200 transition-colors shadow-sm"
                            title="Edit Warehouse"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setWarehouseToDelete(wh)}
                            className="p-1.5 rounded-lg text-primary-800/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors shadow-sm"
                            title="Delete Warehouse"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Warehouse Title */}
                  <h3 className="text-base font-bold text-primary-950 mt-2 tracking-tight group-hover:text-primary-900 transition-colors">
                    {wh.name}
                  </h3>

                  {/* Address */}
                  {wh.address ? (
                    <p className="text-xs text-primary-800/60 mt-1 flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-primary-800/40 flex-shrink-0" />
                      <span>{wh.address}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-primary-800/40 mt-1 italic">No physical address set</p>
                  )}

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-primary-950/10 text-xs">
                    <div className="p-2.5 rounded-lg bg-ivory-100 border border-primary-950/10">
                      <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3 text-primary-900" />
                        <span>Locations</span>
                      </span>
                      <div className="text-base font-mono font-bold text-primary-950 mt-0.5">
                        {wh.locationsCount ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-ivory-100 border border-primary-950/10">
                      <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider flex items-center gap-1">
                        <Box className="w-3 h-3 text-primary-900" />
                        <span>Operations</span>
                      </span>
                      <div className="text-base font-mono font-bold text-primary-950 mt-0.5">
                        {wh.operationsCount ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="mt-5 pt-3 border-t border-primary-950/10">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => navigate(`/warehouses/${wh.id}`)}
                    rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                  >
                    <span>View & Manage Locations</span>
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
          <GlassCard className="p-4">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize) || 1}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          </GlassCard>
        </div>
      )}

      {/* Create Warehouse Modal */}
      <WarehouseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          showToast(`Warehouse ${created.name} (${created.code}) created successfully.`);
          fetchWarehouses(true);
        }}
      />

      {/* Edit Warehouse Modal */}
      <WarehouseModal
        isOpen={Boolean(warehouseToEdit)}
        warehouseToEdit={warehouseToEdit}
        onClose={() => setWarehouseToEdit(null)}
        onSuccess={(updated) => {
          showToast(`Warehouse ${updated.name} updated successfully.`);
          fetchWarehouses(true);
        }}
      />

      {/* Deletion Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(warehouseToDelete)}
        onClose={() => setWarehouseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Warehouse"
        message={`Are you sure you want to delete warehouse '${warehouseToDelete?.name}' (${warehouseToDelete?.code})? This action can only succeed if the warehouse has 0 locations and 0 associated operations.`}
        confirmText="Delete Warehouse"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default WarehousesPage;
