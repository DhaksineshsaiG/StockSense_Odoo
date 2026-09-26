import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Warehouse as WarehouseIcon,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Layers,
  Box,
  Hash,
  Clock,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  ShieldAlert,
  X,
  CheckCircle2,
} from 'lucide-react';

import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { WarehouseModal } from '../../components/warehouses/WarehouseModal';
import { LocationModal } from '../../components/warehouses/LocationModal';
import { LocationStockModal } from '../../components/warehouses/LocationStockModal';

import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { useAuth } from '../../contexts/AuthContext';
import { WarehouseDetail, WarehouseLocationItem, Location } from '../../types';

export const WarehouseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  // Detail State
  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Locations Filter & Search (filtered locally from warehouse.locations)
  const [locationSearch, setLocationSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals & Action States
  const [isEditWarehouseOpen, setIsEditWarehouseOpen] = useState(false);
  const [isDeleteWarehouseOpen, setIsDeleteWarehouseOpen] = useState(false);
  const [isDeletingWarehouse, setIsDeletingWarehouse] = useState(false);

  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<WarehouseLocationItem | null>(null);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);

  // Stock Quants View Modal
  const [viewStockLocationId, setViewStockLocationId] = useState<string | null>(null);

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

  // Fetch Warehouse Detail
  const fetchWarehouseDetail = useCallback(
    async (showRefreshing = false) => {
      if (!id) return;
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const data = await warehouseApi.getWarehouseById(id);
        setWarehouse(data);
      } catch (err: any) {
        console.error('Failed to load warehouse detail:', err);
        setError(err?.response?.data?.error || err?.response?.data?.message || 'Warehouse not found.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchWarehouseDetail();
  }, [fetchWarehouseDetail]);

  // Handle Warehouse Deletion
  const handleDeleteWarehouse = async () => {
    if (!id || !warehouse) return;
    setIsDeletingWarehouse(true);

    try {
      const res = await warehouseApi.deleteWarehouse(id);
      showToast(res.message || 'Warehouse deleted successfully.');
      setIsDeleteWarehouseOpen(false);
      navigate('/warehouses');
    } catch (err: any) {
      console.error('Failed to delete warehouse:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Unable to delete warehouse.';
      showError(msg);
      setIsDeleteWarehouseOpen(false);
    } finally {
      setIsDeletingWarehouse(false);
    }
  };

  // Handle Location Deletion
  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    setIsDeletingLocation(true);

    try {
      const res = await locationsApi.deleteLocation(locationToDelete.id);
      showToast(res.message || `Location ${locationToDelete.name} deleted successfully.`);
      setLocationToDelete(null);
      fetchWarehouseDetail(true);
    } catch (err: any) {
      console.error('Failed to delete location:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Unable to delete location.';
      showError(msg);
      setLocationToDelete(null);
    } finally {
      setIsDeletingLocation(false);
    }
  };

  // Filter Locations locally
  const filteredLocations = useMemo(() => {
    if (!warehouse?.locations) return [];
    return warehouse.locations.filter((loc) => {
      const matchesSearch =
        !locationSearch.trim() ||
        loc.name.toLowerCase().includes(locationSearch.trim().toLowerCase()) ||
        loc.code.toLowerCase().includes(locationSearch.trim().toLowerCase());

      const matchesType =
        typeFilter === 'ALL' || loc.type.toUpperCase() === typeFilter.toUpperCase();

      return matchesSearch && matchesType;
    });
  }, [warehouse?.locations, locationSearch, typeFilter]);

  // Helper for location type badge
  const renderLocationTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'INTERNAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-primary-950/10 text-primary-900 border border-primary-950/20">
            <Layers className="w-3 h-3" />
            <span>Internal</span>
          </span>
        );
      case 'VENDOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Vendor</span>
          </span>
        );
      case 'CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-primary-950/10 text-primary-900 border border-primary-950/20">
            <ArrowUpRight className="w-3 h-3" />
            <span>Customer</span>
          </span>
        );
      case 'INVENTORY_LOSS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Inventory Loss</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-ivory-200 text-primary-800 border border-primary-950/15">
            <span>{type}</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/warehouses')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Warehouses
          </Button>
        </div>
        <GlassCard className="p-6">
          <LoadingSkeleton lines={8} />
        </GlassCard>
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/warehouses')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Warehouses
          </Button>
        </div>
        <GlassCard className="p-8">
          <ErrorState
            title="Warehouse not found."
            message={error || 'Unable to retrieve warehouse details.'}
            onRetry={() => fetchWarehouseDetail(true)}
          />
        </GlassCard>
      </div>
    );
  }

  const createdDate = warehouse.createdAt ? new Date(warehouse.createdAt) : null;

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
            <span className="font-bold">Action Blocked: </span>
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

      {/* Top Navigation Bar / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/warehouses')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Warehouses
          </Button>

          <div className="h-4 w-px bg-primary-950/15" />

          <div className="text-xs text-primary-800/60">
            <Link to="/warehouses" className="hover:text-primary-950 transition-colors">
              Facilities
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-primary-950 font-semibold">{warehouse.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchWarehouseDetail(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {isManager && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditWarehouseOpen(true)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteWarehouseOpen(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Warehouse Header Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-primary-950/10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary-900 bg-primary-950/10 px-2.5 py-1 rounded border border-primary-950/20">
                {warehouse.code}
              </span>
              <h1 className="text-2xl font-bold text-primary-950 tracking-tight">
                {warehouse.name}
              </h1>
            </div>

            {warehouse.address ? (
              <p className="text-xs text-primary-800/80 mt-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-900 flex-shrink-0" />
                <span>{warehouse.address}</span>
              </p>
            ) : (
              <p className="text-xs text-primary-800/40 mt-1 italic">No physical address set</p>
            )}

            {createdDate && (
              <p className="text-[11px] text-primary-800/50 mt-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary-800/40" />
                <span>Configured on {createdDate.toLocaleDateString()}</span>
              </p>
            )}
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-ivory-100 border border-primary-950/10 shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Locations
              </div>
              <div className="text-xl font-mono font-bold text-primary-950 mt-0.5">
                {warehouse.locations?.length || 0}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Total On-Hand
              </div>
              <div className="text-xl font-mono font-bold text-primary-950 mt-0.5">
                {warehouse.stockSummary?.totalOnHand ?? 0}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Reserved
              </div>
              <div className="text-xl font-mono font-bold text-amber-800 mt-0.5">
                {warehouse.stockSummary?.totalReserved ?? 0}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Free to Use
              </div>
              <div className="text-xl font-mono font-bold text-emerald-700 mt-0.5">
                {warehouse.stockSummary?.freeToUse ?? 0}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Locations Section */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-primary-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-900" />
              <h2 className="text-base font-bold text-primary-950 tracking-tight">
                Storage Locations ({warehouse.locations?.length || 0})
              </h2>
            </div>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Internal bins, receiving docks, output staging zones, and loss quants.
            </p>
          </div>

          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddLocationOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Location
            </Button>
          )}
        </div>

        {/* Locations Filter Toolbar */}
        <div className="p-4 border-b border-primary-950/10 bg-primary-950/[0.01]">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:max-w-xs">
              <Input
                placeholder="Search locations by name or code..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="py-1.5 text-xs"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Location Types' },
                  { value: 'INTERNAL', label: 'Internal Storage' },
                  { value: 'VENDOR', label: 'Vendor' },
                  { value: 'CUSTOMER', label: 'Customer' },
                  { value: 'INVENTORY_LOSS', label: 'Inventory Loss' },
                ]}
                className="py-1.5 text-xs"
              />
            </div>

            {(locationSearch.trim() || typeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setLocationSearch('');
                  setTypeFilter('ALL');
                }}
                className="text-xs text-primary-800/60 hover:text-primary-950 flex items-center gap-1 self-start sm:self-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Locations Table */}
        {!warehouse.locations || warehouse.locations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Layers className="w-8 h-8 text-primary-800/40" />}
              title="No locations found in this warehouse."
              description="Create storage locations to organize physical inventory and define operational routes."
              action={
                isManager ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddLocationOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Location
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Search className="w-8 h-8 text-primary-800/40" />}
              title="No matching locations."
              description="No locations match your current search or type filter."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setLocationSearch('');
                    setTypeFilter('ALL');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-3 px-4">Location Name</th>
                  <th className="py-3 px-3">Code / Path</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">On Hand</th>
                  <th className="py-3 px-3 text-right">Reserved</th>
                  <th className="py-3 px-3 text-right">Free to Use</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-primary-900">
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-primary-950/[0.02] transition-colors">
                    {/* Location Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary-950">{loc.name}</div>
                    </td>

                    {/* Code */}
                    <td className="py-3 px-3 font-mono text-primary-800/70">
                      {loc.code}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderLocationTypeBadge(loc.type)}
                    </td>

                    {/* On Hand */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-primary-950">
                      {loc.onHand}
                    </td>

                    {/* Reserved */}
                    <td className="py-3 px-3 text-right font-mono text-amber-800">
                      {loc.reservedQuantity}
                    </td>

                    {/* Free to Use */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {loc.freeToUse}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewStockLocationId(loc.id)}
                          className="p-1.5 rounded-lg border border-primary-950/15 text-primary-800 hover:text-primary-950 hover:bg-ivory-200 transition-colors shadow-sm"
                          title="View Product Stock Quants"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>

                        {isManager && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setLocationToEdit({
                                  id: loc.id,
                                  name: loc.name,
                                  code: loc.code,
                                  type: loc.type,
                                  warehouseId: warehouse.id,
                                })
                              }
                              className="p-1.5 rounded-lg border border-primary-950/15 text-primary-800 hover:text-primary-950 hover:bg-ivory-200 transition-colors shadow-sm"
                              title="Edit Location"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setLocationToDelete(loc)}
                              className="p-1.5 rounded-lg border border-primary-950/15 text-primary-800 hover:text-rose-600 hover:bg-rose-500/10 transition-colors shadow-sm"
                              title="Delete Location"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Edit Warehouse Modal */}
      <WarehouseModal
        isOpen={isEditWarehouseOpen}
        warehouseToEdit={{
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address,
        }}
        onClose={() => setIsEditWarehouseOpen(false)}
        onSuccess={(updated) => {
          showToast(`Warehouse ${updated.name} updated successfully.`);
          fetchWarehouseDetail(true);
        }}
      />

      {/* Delete Warehouse Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteWarehouseOpen}
        onClose={() => setIsDeleteWarehouseOpen(false)}
        onConfirm={handleDeleteWarehouse}
        title="Delete Warehouse"
        message={`Are you sure you want to delete warehouse '${warehouse.name}' (${warehouse.code})? This action will permanently remove the facility if it has 0 locations and 0 operations.`}
        confirmText="Delete Facility"
        variant="danger"
        isLoading={isDeletingWarehouse}
      />

      {/* Add Location Modal */}
      <LocationModal
        isOpen={isAddLocationOpen}
        warehouseId={warehouse.id}
        warehouseCode={warehouse.code}
        onClose={() => setIsAddLocationOpen(false)}
        onSuccess={(created) => {
          showToast(`Location ${created.name} (${created.code}) created successfully.`);
          fetchWarehouseDetail(true);
        }}
      />

      {/* Edit Location Modal */}
      <LocationModal
        isOpen={Boolean(locationToEdit)}
        warehouseId={warehouse.id}
        warehouseCode={warehouse.code}
        locationToEdit={locationToEdit}
        onClose={() => setLocationToEdit(null)}
        onSuccess={(updated) => {
          showToast(`Location ${updated.name} updated successfully.`);
          fetchWarehouseDetail(true);
        }}
      />

      {/* Delete Location Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(locationToDelete)}
        onClose={() => setLocationToDelete(null)}
        onConfirm={handleDeleteLocation}
        title="Delete Location"
        message={`Are you sure you want to delete location '${locationToDelete?.name}' (${locationToDelete?.code})? This will fail if the location has active/reserved stock, reorder rules, operations, or historical moves.`}
        confirmText="Delete Location"
        variant="danger"
        isLoading={isDeletingLocation}
      />

      {/* Product Stock Breakdown Modal */}
      <LocationStockModal
        locationId={viewStockLocationId}
        onClose={() => setViewStockLocationId(null)}
      />
    </div>
  );
};

export default WarehouseDetailPage;
