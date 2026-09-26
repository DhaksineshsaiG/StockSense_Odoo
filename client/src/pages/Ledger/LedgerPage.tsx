import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  X,
  Calendar,
  Building2,
  FolderTree,
  Package,
  MapPin,
  TrendingDown,
  TrendingUp,
  Layers,
} from 'lucide-react';

import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';

import { ledgerApi } from '../../api/ledger';
import { warehouseApi } from '../../api/warehouses';
import { categoriesApi } from '../../api/categories';
import { productsApi } from '../../api/products';
import { locationsApi } from '../../api/locations';
import {
  StockMoveRecord,
  MoveDirection,
  Warehouse,
  CategoryItem,
  ProductListItem,
  Location,
} from '../../types';

export const LedgerPage: React.FC = () => {
  const navigate = useNavigate();

  // Ledger Move Records & Pagination State
  const [moves, setMoves] = useState<StockMoveRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Metadata for filter dropdowns
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load lookup metadata once on mount
  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      try {
        const [whList, catRes, prodRes, locList] = await Promise.all([
          warehouseApi.getWarehouses(),
          categoriesApi.getCategories({ limit: 100 }),
          productsApi.getProducts({ limit: 100 }),
          locationsApi.getLocations({ limit: 100 }),
        ]);

        if (isMounted) {
          setWarehouses(whList || []);
          setCategories(catRes.data || []);
          setProducts(prodRes.data || []);
          setLocations(locList || []);
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };

    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch moves from real backend API
  const fetchMoves = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * pageSize;
        const res = await ledgerApi.getMoveHistory({
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
          categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          productId: productFilter !== 'ALL' ? productFilter : undefined,
          locationId: locationFilter !== 'ALL' ? locationFilter : undefined,
          search: debouncedSearch.trim() || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          limit: pageSize,
          offset,
        });

        setMoves(res.items || res.moves || []);
        setTotal(res.total || 0);
      } catch (err: any) {
        console.error('Failed to fetch stock moves:', err);
        setError(err?.response?.data?.message || 'Unable to load inventory movements.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      page,
      pageSize,
      typeFilter,
      statusFilter,
      warehouseFilter,
      categoryFilter,
      productFilter,
      locationFilter,
      debouncedSearch,
      fromDate,
      toDate,
    ]
  );

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  // Reset page to 1 whenever any filter changes
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setWarehouseFilter('ALL');
    setCategoryFilter('ALL');
    setProductFilter('ALL');
    setLocationFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Calculate active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch.trim()) count++;
    if (typeFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (warehouseFilter !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    if (productFilter !== 'ALL') count++;
    if (locationFilter !== 'ALL') count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [
    debouncedSearch,
    typeFilter,
    statusFilter,
    warehouseFilter,
    categoryFilter,
    productFilter,
    locationFilter,
    fromDate,
    toDate,
  ]);

  // Movement direction renderer helper
  const renderDirectionBadge = (direction: MoveDirection, type: string) => {
    switch (direction) {
      case 'INCOMING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Incoming</span>
          </span>
        );
      case 'OUTGOING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
            <ArrowUpRight className="w-3 h-3" />
            <span>Outgoing</span>
          </span>
        );
      case 'INTERNAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-950/10 text-primary-900 border border-primary-950/20">
            <ArrowLeftRight className="w-3 h-3" />
            <span>Internal</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-950/5 text-primary-800/60 border border-primary-950/10">
            <span>{type || 'Movement'}</span>
          </span>
        );
    }
  };

  // Movement Type renderer helper
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-800 border border-emerald-500/25">
            <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
            <span>Receipt</span>
          </span>
        );
      case 'DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-primary-950/10 text-primary-900 border border-primary-950/20">
            <ArrowUpRight className="w-3 h-3 text-primary-900" />
            <span>Delivery</span>
          </span>
        );
      case 'INTERNAL_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 border border-amber-500/25">
            <ArrowLeftRight className="w-3 h-3 text-amber-700" />
            <span>Transfer</span>
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-primary-900/10 text-primary-950 border border-primary-900/25">
            <SlidersHorizontal className="w-3 h-3 text-primary-900" />
            <span>Adjustment</span>
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

  // Quantity sign & styling helper
  const renderQuantity = (move: StockMoveRecord) => {
    const isIncoming = move.direction === 'INCOMING';
    const isOutgoing = move.direction === 'OUTGOING';

    return (
      <div className="text-right">
        <span
          className={`font-mono font-bold text-sm ${
            isIncoming
              ? 'text-emerald-700'
              : isOutgoing
              ? 'text-rose-700'
              : 'text-primary-950'
          }`}
        >
          {isIncoming ? `+${move.quantity}` : isOutgoing ? `-${move.quantity}` : move.quantity}
        </span>{' '}
        <span className="text-[11px] text-primary-800/60 font-normal">{move.uom || move.product?.uom || 'Units'}</span>
      </div>
    );
  };

  // Route path formatting helper
  const renderRoutePath = (move: StockMoveRecord) => {
    let sourceText = move.fromLocation ? `${move.fromLocation.name}` : null;
    let destText = move.toLocation ? `${move.toLocation.name}` : null;

    if (!sourceText) {
      if (move.type === 'RECEIPT') sourceText = 'Vendor / Supplier';
      else if (move.type === 'ADJUSTMENT') sourceText = 'Inventory Gain';
      else sourceText = 'External Source';
    }

    if (!destText) {
      if (move.type === 'DELIVERY') destText = 'Customer / Outbound';
      else if (move.type === 'ADJUSTMENT') destText = 'Inventory Loss';
      else destText = 'External Destination';
    }

    return (
      <div className="text-xs">
        <div className="flex items-center gap-1.5 text-primary-900 font-medium">
          <span className="truncate max-w-[130px] text-primary-800/80" title={sourceText}>
            {sourceText}
          </span>
          <span className="text-primary-800/40 font-bold">→</span>
          <span className="truncate max-w-[130px] text-primary-950 font-semibold" title={destText}>
            {destText}
          </span>
        </div>
        {move.warehouse && (
          <div className="text-[10px] text-primary-800/50 mt-0.5">
            {move.warehouse.name} ({move.warehouse.code})
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900 shadow-sm">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-950 tracking-tight">Stock Ledger</h1>
              <p className="text-xs text-primary-800/60 mt-0.5">
                Track every inventory movement across your warehouses.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchMoves(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-primary-950/10">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary-900" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary-950">
              Ledger Search & Filters
            </h2>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-950/10 text-primary-900 border border-primary-950/20">
                {activeFiltersCount} active
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-primary-800/60 hover:text-primary-950 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Row 1: Search, Movement Type, Status, Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Input
                placeholder="Search reference, SKU, product, location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <Select
                value={typeFilter}
                onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Movement Types' },
                  { value: 'RECEIPT', label: 'Receipts' },
                  { value: 'DELIVERY', label: 'Deliveries' },
                  { value: 'INTERNAL_TRANSFER', label: 'Internal Transfers' },
                  { value: 'ADJUSTMENT', label: 'Inventory Adjustments' },
                ]}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <Select
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'DONE', label: 'Done' },
                  { value: 'READY', label: 'Ready' },
                  { value: 'WAITING', label: 'Waiting' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'CANCELED', label: 'Canceled' },
                ]}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <Select
                value={warehouseFilter}
                onChange={(e) => handleFilterChange(setWarehouseFilter, e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Warehouses' },
                  ...warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${w.code})`,
                  })),
                ]}
                className="py-2 text-xs"
              />
            </div>
          </div>

          {/* Row 2: Category, Product, Location, From Date, To Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            <div>
              <Select
                value={categoryFilter}
                onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  ...categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <Select
                value={productFilter}
                onChange={(e) => handleFilterChange(setProductFilter, e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Products' },
                  ...products.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.sku})`,
                  })),
                ]}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <Select
                value={locationFilter}
                onChange={(e) => handleFilterChange(setLocationFilter, e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Locations' },
                  ...locations.map((loc) => ({
                    value: loc.id,
                    label: `${loc.name} (${loc.code})`,
                  })),
                ]}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-ivory-100 border border-primary-950/15 text-primary-950 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
                  title="From Date"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleFilterChange(setToDate, e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-ivory-100 border border-primary-950/15 text-primary-950 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
                  title="To Date"
                />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main Ledger Content */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Table Header Summary */}
        <div className="px-5 py-3 border-b border-primary-950/10 flex items-center justify-between text-xs text-primary-800/60">
          <div>
            Total Movements:{' '}
            <span className="font-semibold text-primary-950">{total.toLocaleString()}</span>
          </div>
          {total > 0 && (
            <div>
              Page <span className="font-semibold text-primary-950">{page}</span> of{' '}
              <span className="font-semibold text-primary-950">
                {Math.ceil(total / pageSize) || 1}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton lines={8} />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Unable to load inventory movements."
              message={error}
              onRetry={() => fetchMoves(true)}
            />
          </div>
        ) : moves.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<History className="w-8 h-8 text-primary-800/40" />}
              title="No inventory movements found."
              description={
                activeFiltersCount > 0
                  ? 'Try changing your filters or search criteria.'
                  : 'Validated receipts, deliveries, internal transfers, and adjustments will create permanent stock movement audit entries here.'
              }
              action={
                activeFiltersCount > 0 ? (
                  <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                    Clear Active Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-3">Date / Time</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Direction</th>
                    <th className="py-3 px-3">Product / SKU</th>
                    <th className="py-3 px-3 text-right">Quantity</th>
                    <th className="py-3 px-3">Route (Source → Dest)</th>
                    <th className="py-3 px-3">Warehouse</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Responsible</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-950/5 text-primary-900">
                  {moves.map((move) => {
                    const formattedDate = move.timestamp || move.date;
                    const dateObj = formattedDate ? new Date(formattedDate) : null;

                    return (
                      <tr
                        key={move.id}
                        className="hover:bg-primary-950/[0.02] transition-colors cursor-pointer"
                        onClick={() => navigate(`/ledger/${move.id}`)}
                      >
                        {/* Reference */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-primary-950 hover:text-primary-800 transition-colors">
                            {move.reference}
                          </span>
                          {move.operation?.reference && move.operation.reference !== move.reference && (
                            <div className="text-[10px] text-primary-800/60 font-mono">
                              Op: {move.operation.reference}
                            </div>
                          )}
                        </td>

                        {/* Date / Time */}
                        <td className="py-3 px-3 text-primary-800/80 whitespace-nowrap">
                          {dateObj ? (
                            <>
                              <div>
                                {dateObj.toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-[10px] text-primary-800/40 font-mono">
                                {dateObj.toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Movement Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderTypeBadge(move.type)}
                        </td>

                        {/* Direction */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderDirectionBadge(move.direction, move.type)}
                        </td>

                        {/* Product / SKU */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-primary-950 truncate max-w-[160px]" title={move.product?.name}>
                            {move.product?.name || 'Unknown Product'}
                          </div>
                          <div className="text-[10px] text-primary-800/60 font-mono mt-0.5">
                            {move.product?.sku || '—'}
                          </div>
                          {move.category && (
                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded bg-primary-950/5 text-primary-800/70 border border-primary-950/10">
                              {move.category.name}
                            </span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderQuantity(move)}
                        </td>

                        {/* Route Path (Source -> Dest) */}
                        <td className="py-3 px-3 min-w-[180px]">
                          {renderRoutePath(move)}
                        </td>

                        {/* Warehouse */}
                        <td className="py-3 px-3 text-primary-800/80 whitespace-nowrap">
                          {move.warehouse ? (
                            <div>
                              <div className="font-medium text-primary-950">{move.warehouse.name}</div>
                              <div className="text-[10px] text-primary-800/50 font-mono">{move.warehouse.code}</div>
                            </div>
                          ) : (
                            <span className="text-primary-800/40">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <StatusBadge status={move.status || 'DONE'} />
                        </td>

                        {/* Responsible */}
                        <td className="py-3 px-3 text-primary-800/80 whitespace-nowrap">
                          {move.responsible ? (
                            <div>
                              <div className="font-medium text-primary-950 truncate max-w-[110px]" title={move.responsible.name}>
                                {move.responsible.name}
                              </div>
                              <div className="text-[10px] text-primary-800/50">{move.responsible.role || 'User'}</div>
                            </div>
                          ) : (
                            <span className="text-primary-800/40">System</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ledger/${move.id}`);
                            }}
                            className="p-1.5 rounded-lg border border-primary-950/15 text-primary-800 hover:text-primary-950 hover:bg-ivory-200 transition-colors shadow-sm"
                            title="View Move Audit Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / pageSize) || 1}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
};

export default LedgerPage;
