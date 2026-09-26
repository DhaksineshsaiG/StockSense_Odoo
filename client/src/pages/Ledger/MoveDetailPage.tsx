import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  History,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Package,
  Calendar,
  Building2,
  MapPin,
  User,
  ShieldCheck,
  FileText,
  ExternalLink,
  Layers,
  Clock,
  CheckCircle2,
} from 'lucide-react';

import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';

import { ledgerApi } from '../../api/ledger';
import { StockMoveRecord, MoveDirection } from '../../types';

export const MoveDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [move, setMove] = useState<StockMoveRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await ledgerApi.getMoveById(id);
        if (isMounted) setMove(data);
      } catch (err: any) {
        console.error('Failed to load move detail:', err);
        if (isMounted) {
          setError(err?.response?.data?.message || 'Stock movement record not found.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/ledger')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Ledger
          </Button>
        </div>
        <GlassCard className="p-6">
          <LoadingSkeleton lines={8} />
        </GlassCard>
      </div>
    );
  }

  if (error || !move) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/ledger')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Ledger
          </Button>
        </div>
        <GlassCard className="p-8">
          <ErrorState
            title="Stock movement not found."
            message={error || 'Unable to retrieve the requested ledger move record.'}
            onRetry={() => window.location.reload()}
          />
        </GlassCard>
      </div>
    );
  }

  const formattedDate = move.timestamp || move.date;
  const dateObj = formattedDate ? new Date(formattedDate) : null;

  // Resolve operation link
  const getOperationPath = (opType?: string, opId?: string) => {
    if (!opId) return null;
    const type = (opType || move.type || '').toUpperCase();
    switch (type) {
      case 'RECEIPT':
        return `/operations/receipts/${opId}`;
      case 'DELIVERY':
        return `/operations/deliveries/${opId}`;
      case 'INTERNAL_TRANSFER':
        return `/operations/transfers/${opId}`;
      case 'ADJUSTMENT':
        return `/operations/adjustments/${opId}`;
      default:
        return null;
    }
  };

  const operationLink = getOperationPath(move.operation?.type, move.operationId || move.operation?.id);

  // Direction badge renderer
  const renderDirectionBadge = (direction: MoveDirection) => {
    switch (direction) {
      case 'INCOMING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Incoming Stock</span>
          </span>
        );
      case 'OUTGOING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Outgoing Stock</span>
          </span>
        );
      case 'INTERNAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-950/10 text-primary-900 border border-primary-950/20">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Internal Transfer</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-950/5 text-primary-800/60 border border-primary-950/10">
            <span>Movement</span>
          </span>
        );
    }
  };

  // Movement Type Badge
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-800 border border-emerald-500/25">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
            <span>Receipt</span>
          </span>
        );
      case 'DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-primary-950/10 text-primary-900 border border-primary-950/20">
            <ArrowUpRight className="w-3.5 h-3.5 text-primary-900" />
            <span>Delivery Order</span>
          </span>
        );
      case 'INTERNAL_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 border border-amber-500/25">
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
            <span>Internal Transfer</span>
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-primary-900/10 text-primary-950 border border-primary-900/25">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary-900" />
            <span>Inventory Adjustment</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-ivory-200 text-primary-800 border border-primary-950/15">
            <span>{type}</span>
          </span>
        );
    }
  };

  // Source & Destination resolution
  const getSourceDisplay = () => {
    if (move.fromLocation) {
      return {
        title: move.fromLocation.name,
        code: move.fromLocation.code,
        type: move.fromLocation.type || 'Internal Location',
        isExternal: false,
      };
    }
    if (move.type === 'RECEIPT') {
      return {
        title: move.operation?.partnerName || 'External Vendor / Supplier',
        code: 'SUPPLIER',
        type: 'External Partner',
        isExternal: true,
      };
    }
    if (move.type === 'ADJUSTMENT') {
      return {
        title: 'Inventory Gain / Physical Discrepancy',
        code: 'ADJUSTMENT-SRC',
        type: 'System Balancing Quant',
        isExternal: true,
      };
    }
    return {
      title: 'External / Origin Unknown',
      code: 'UNKNOWN',
      type: 'Source Location',
      isExternal: true,
    };
  };

  const getDestinationDisplay = () => {
    if (move.toLocation) {
      return {
        title: move.toLocation.name,
        code: move.toLocation.code,
        type: move.toLocation.type || 'Internal Location',
        isExternal: false,
      };
    }
    if (move.type === 'DELIVERY') {
      return {
        title: move.operation?.partnerName || 'External Customer / Client',
        code: 'CUSTOMER',
        type: 'External Destination',
        isExternal: true,
      };
    }
    if (move.type === 'ADJUSTMENT') {
      return {
        title: 'Inventory Loss / Scrap Quant',
        code: 'ADJUSTMENT-DST',
        type: 'System Balancing Quant',
        isExternal: true,
      };
    }
    return {
      title: 'External / Destination Unknown',
      code: 'UNKNOWN',
      type: 'Destination Location',
      isExternal: true,
    };
  };

  const sourceInfo = getSourceDisplay();
  const destInfo = getDestinationDisplay();

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb / Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/ledger')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Ledger
          </Button>

          <div className="h-4 w-px bg-primary-950/15" />

          <div className="text-xs text-primary-800/60">
            <Link to="/ledger" className="hover:text-primary-950 transition-colors">
              Stock Ledger
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-primary-950 font-mono font-semibold">{move.reference}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {operationLink && (
            <Link to={operationLink}>
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ExternalLink className="w-3.5 h-3.5 ml-1" />}
              >
                View Originating Operation
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Overview Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-primary-950/10">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-2xl font-bold text-primary-950 tracking-tight">
                {move.reference}
              </span>
              {renderTypeBadge(move.type)}
              {renderDirectionBadge(move.direction)}
              <StatusBadge status={move.status || 'DONE'} />
            </div>

            <p className="text-xs text-primary-800/60 mt-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary-800/40" />
              <span>
                Executed on{' '}
                {dateObj
                  ? `${dateObj.toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })} at ${dateObj.toLocaleTimeString()}`
                  : '—'}
              </span>
            </p>
          </div>

          {/* Quick Metrics Banner */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-ivory-100 border border-primary-950/10 shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Quantity Moved
              </div>
              <div className="text-2xl font-mono font-bold mt-0.5">
                <span
                  className={
                    move.direction === 'INCOMING'
                      ? 'text-emerald-700'
                      : move.direction === 'OUTGOING'
                      ? 'text-rose-700'
                      : 'text-primary-950'
                  }
                >
                  {move.direction === 'INCOMING'
                    ? `+${move.quantity}`
                    : move.direction === 'OUTGOING'
                    ? `-${move.quantity}`
                    : move.quantity}
                </span>{' '}
                <span className="text-xs text-primary-800/60 font-normal">
                  {move.uom || move.product?.uom || 'Units'}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-primary-950/10" />

            <div>
              <div className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Facility / Warehouse
              </div>
              <div className="text-sm font-semibold text-primary-950 mt-1">
                {move.warehouse?.name || 'Central Facility'}
              </div>
              {move.warehouse?.code && (
                <div className="text-[10px] font-mono text-primary-800/60">{move.warehouse.code}</div>
              )}
            </div>
          </div>
        </div>

        {/* Transfer Path / Movement Route Flow */}
        <div className="pt-6">
          <div className="text-xs font-bold uppercase tracking-wider text-primary-800/60 mb-4 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary-900" />
            <span>Movement Route (Double-Entry Source & Destination)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            {/* Source Card */}
            <div className="md:col-span-5 p-4 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-800/60">
                  Source Origin
                </span>
                <span className="text-[10px] font-mono text-primary-800/70 bg-primary-950/5 border border-primary-950/10 px-1.5 py-0.5 rounded">
                  {sourceInfo.code}
                </span>
              </div>
              <div className="text-base font-semibold text-primary-950">{sourceInfo.title}</div>
              <div className="text-xs text-primary-800/60">{sourceInfo.type}</div>
              {move.fromLocation?.warehouseId && move.warehouse && (
                <div className="text-[11px] text-primary-800/50 pt-1">
                  Warehouse: {move.warehouse.name}
                </div>
              )}
            </div>

            {/* Direction Arrow */}
            <div className="md:col-span-1 flex justify-center py-2 md:py-0">
              <div className="w-10 h-10 rounded-full bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900">
                <ArrowUpRight className="w-5 h-5 rotate-45" />
              </div>
            </div>

            {/* Destination Card */}
            <div className="md:col-span-5 p-4 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-800/60">
                  Destination Target
                </span>
                <span className="text-[10px] font-mono text-primary-800/70 bg-primary-950/5 border border-primary-950/10 px-1.5 py-0.5 rounded">
                  {destInfo.code}
                </span>
              </div>
              <div className="text-base font-semibold text-primary-950">{destInfo.title}</div>
              <div className="text-xs text-primary-800/60">{destInfo.type}</div>
              {move.toLocation?.warehouseId && move.warehouse && (
                <div className="text-[11px] text-primary-800/50 pt-1">
                  Warehouse: {move.warehouse.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Grid: Product Details & Audit / Originating Operation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Specification Card */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-primary-950 uppercase tracking-wider">
                Product Specification
              </h3>
            </div>
            {move.product?.id && (
              <Link
                to={`/products/${move.product.id}`}
                className="text-xs text-primary-900 hover:text-primary-800 flex items-center gap-1 font-semibold"
              >
                <span>Product Card</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
              <span className="text-primary-800/60">Product Name</span>
              <span className="font-semibold text-primary-950">{move.product?.name}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
              <span className="text-primary-800/60">SKU Code</span>
              <span className="font-mono text-primary-900">{move.product?.sku}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
              <span className="text-primary-800/60">Category</span>
              <span className="text-primary-950">{move.category?.name || 'Uncategorized'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
              <span className="text-primary-800/60">Unit of Measure (UoM)</span>
              <span className="text-primary-950">{move.uom || move.product?.uom || 'Units'}</span>
            </div>

            {move.product?.costPrice !== undefined && (
              <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
                <span className="text-primary-800/60">Unit Cost Price</span>
                <span className="font-mono text-primary-950">
                  ${Number(move.product.costPrice).toFixed(2)}
                </span>
              </div>
            )}

            {move.product?.salePrice !== undefined && (
              <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
                <span className="text-primary-800/60">Unit Sale Price</span>
                <span className="font-mono text-primary-950">
                  ${Number(move.product.salePrice).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Audit & Originating Operation Details */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-primary-950 uppercase tracking-wider">
                Audit Trail & Operation Context
              </h3>
            </div>
            {operationLink && (
              <Link
                to={operationLink}
                className="text-xs text-primary-900 hover:text-primary-800 flex items-center gap-1 font-semibold"
              >
                <span>Full Operation</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
              <span className="text-primary-800/60">Responsible User</span>
              <div className="text-right">
                <div className="font-semibold text-primary-950">
                  {move.responsible?.name || 'System / Auto'}
                </div>
                {move.responsible?.email && (
                  <div className="text-[10px] text-primary-800/60">{move.responsible.email}</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
              <span className="text-primary-800/60">User Role</span>
              <span className="font-medium text-primary-900">
                {move.responsible?.role || 'SYSTEM_OPERATOR'}
              </span>
            </div>

            {move.operation ? (
              <>
                <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
                  <span className="text-primary-800/60">Operation Reference</span>
                  <span className="font-mono font-bold text-primary-950">
                    {move.operation.reference}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
                  <span className="text-primary-800/60">Operation Status</span>
                  <StatusBadge status={move.operation.status} />
                </div>

                {move.operation.partnerName && (
                  <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
                    <span className="text-primary-800/60">Partner / Contact</span>
                    <span className="text-primary-950">{move.operation.partnerName}</span>
                  </div>
                )}

                {move.operation.completedDate && (
                  <div className="flex items-center justify-between py-1.5 border-b border-primary-950/5">
                    <span className="text-primary-800/60">Validation Timestamp</span>
                    <span className="text-primary-950">
                      {new Date(move.operation.completedDate).toLocaleString()}
                    </span>
                  </div>
                )}

                {move.operation.notes && (
                  <div className="py-1.5 border-b border-primary-950/5">
                    <span className="text-primary-800/60 block mb-1">Notes / Instructions:</span>
                    <p className="text-primary-950 italic bg-ivory-100 p-2 rounded-lg border border-primary-950/10">
                      {move.operation.notes}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-3 text-primary-800/40 text-center italic">
                Direct journal adjustment move — no attached multi-item operation.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default MoveDetailPage;
