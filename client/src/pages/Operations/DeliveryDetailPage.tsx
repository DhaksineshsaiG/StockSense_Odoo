import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Package,
  Layers,
  History,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { DeliveryModal } from '../../components/operations/DeliveryModal';

import { deliveriesApi } from '../../api/operations';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { productsApi } from '../../api/products';
import {
  OperationRecord,
  Warehouse,
  Location,
  ProductListItem,
  DeliveryAvailabilityLine,
} from '../../types';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<OperationRecord | null>(null);
  const [availabilityLines, setAvailabilityLines] = useState<DeliveryAvailabilityLine[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modals & Confirmation Dialogs
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Lookup metadata for editing
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDelivery = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await deliveriesApi.getDeliveryById(id);
      setDelivery(data);
    } catch (err: any) {
      console.error('Failed to load delivery order details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  useEffect(() => {
    const loadLookups = async () => {
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
        console.error('Failed to load lookup data:', err);
      }
    };
    loadLookups();
  }, []);

  // Check Availability Handler
  const handleCheckAvailability = async () => {
    if (!delivery) return;
    setIsCheckingAvailability(true);
    try {
      const res = await deliveriesApi.checkDeliveryAvailability(delivery.id);
      setAvailabilityLines(res.lines || []);
      if (res.delivery) {
        setDelivery(res.delivery);
      } else {
        await fetchDelivery();
      }

      if (res.isFullyAvailable) {
        showToast('All items are in stock! Reserved for this delivery (READY).');
      } else {
        showToast('Insufficient stock! Shortage detected for one or more lines (WAITING).');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to check availability.');
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Validate Delivery Handler
  const handleValidate = async () => {
    if (!delivery) return;
    setIsActionLoading(true);
    try {
      const updated = await deliveriesApi.validateDelivery(delivery.id);
      setDelivery(updated);
      setIsValidateDialogOpen(false);
      showToast(`Delivery ${delivery.reference} validated! Outgoing stock deducted.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate delivery order.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Delivery Handler
  const handleCancel = async () => {
    if (!delivery) return;
    setIsActionLoading(true);
    try {
      const updated = await deliveriesApi.cancelDelivery(delivery.id);
      setDelivery(updated);
      setIsCancelDialogOpen(false);
      showToast(`Delivery ${delivery.reference} canceled. Reservations released.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel delivery order.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={2} />
        <GlassCard className="p-6">
          <LoadingSkeleton lines={6} />
        </GlassCard>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-primary-950/60 mb-4">Delivery order document not found.</p>
        <Button variant="secondary" onClick={() => navigate('/operations/deliveries')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Deliveries
        </Button>
      </div>
    );
  }

  const isDraft = delivery.status === 'DRAFT';
  const isWaiting = delivery.status === 'WAITING';
  const isReady = delivery.status === 'READY';
  const isDone = delivery.status === 'DONE';
  const isCanceled = delivery.status === 'CANCELED';

  const canEdit = isDraft;
  const canCheckAvailability = isDraft || isWaiting;
  const canValidate = isReady;
  const canCancel = isDraft || isWaiting || isReady;

  const totalDemand = delivery.items?.reduce((sum, it) => sum + it.demandQty, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-primary-950/90 border border-primary-900 text-ivory-100 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/deliveries"
            className="p-2 rounded-xl bg-primary-950/5 border border-primary-950/10 text-primary-800/70 hover:text-primary-950 hover:bg-primary-950/10 transition-colors"
            title="Back to Deliveries"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-primary-950 tracking-tight">{delivery.reference}</span>
              <StatusBadge status={delivery.status} size="sm" />
            </div>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Outbound Customer Delivery Document • Created on{' '}
              {new Date(delivery.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="!text-xs"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Draft
            </Button>
          )}

          {canCheckAvailability && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCheckAvailability}
              disabled={isCheckingAvailability}
              className="!text-xs !border-amber-700/30 !bg-amber-600/10 !text-amber-800 hover:!bg-amber-600/20"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${isCheckingAvailability ? 'animate-spin' : ''}`}
              />
              Check Availability
            </Button>
          )}

          {canValidate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsValidateDialogOpen(true)}
              className="!bg-emerald-700 hover:!bg-emerald-800 !text-ivory-100 !text-xs shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Validate & Ship
            </Button>
          )}

          {canCancel && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCancelDialogOpen(true)}
              className="!text-xs !text-rose-600 hover:!bg-rose-50 hover:!border-rose-200"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
          )}

          {isDone && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Outbound Stock Shipped & Ledger Updated
            </div>
          )}

          {isCanceled && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Canceled (Reservations Released)
            </div>
          )}
        </div>
      </div>

      {/* Availability Status Banner */}
      {isReady && (
        <div className="p-4 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 flex items-center gap-3 text-xs text-emerald-800">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div>
            <span className="font-bold text-primary-950 block">Stock Reserved & Ready for Shipping</span>
            <span>
              All required product quantities have been reserved in warehouse inventory. Ready for validation.
            </span>
          </div>
        </div>
      )}

      {isWaiting && (
        <div className="p-4 rounded-2xl bg-amber-600/10 border border-amber-600/20 flex items-center gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <div>
            <span className="font-bold text-primary-950 block">Insufficient Free Stock (Waiting)</span>
            <span>
              One or more lines cannot be fulfilled from available on-hand stock. Restock via Receipts or Transfers before validating.
            </span>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customer */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-950 flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Customer / Partner
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {delivery.partnerName || 'Generic Customer'}
            </span>
          </div>
        </GlassCard>

        {/* Source Location */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900 flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Source Location
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {delivery.sourceLocation?.name || 'Stock Location'}
            </span>
            <span className="text-[10px] text-primary-800/50 block font-mono">
              {delivery.sourceLocation?.code} ({delivery.warehouse?.name})
            </span>
          </div>
        </GlassCard>

        {/* Scheduled Date */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900 flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Shipment Date
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {delivery.scheduledDate
                ? new Date(delivery.scheduledDate).toLocaleDateString()
                : 'Immediate'}
            </span>
          </div>
        </GlassCard>

        {/* Responsible Staff */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-800 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Responsible
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {delivery.responsible?.name || 'System Operator'}
            </span>
            <span className="text-[10px] text-primary-800/50 block truncate">
              {delivery.responsible?.email || 'Automatic'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Notes */}
      {delivery.notes && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-950 mb-1">
            <FileText className="w-3.5 h-3.5 text-primary-800/60" />
            <span>Operation Notes</span>
          </div>
          <p className="text-xs text-primary-800/80 whitespace-pre-wrap">{delivery.notes}</p>
        </GlassCard>
      )}

      {/* Live Availability Lines (if user checked availability) */}
      {availabilityLines && availabilityLines.length > 0 && (
        <GlassCard className="p-0 overflow-hidden border-primary-950/10">
          <div className="px-5 py-3.5 border-b border-primary-950/10 flex items-center justify-between bg-primary-950/[0.02]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-primary-950">Stock Availability Inspection Results</h3>
            </div>
            <span className="text-[11px] text-primary-800/70">Live Free-to-Use & Reservation Status</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px] bg-primary-950/[0.01]">
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Demand</th>
                  <th className="py-3 px-4 font-semibold text-right">Available Free</th>
                  <th className="py-3 px-4 font-semibold text-right">Reserved</th>
                  <th className="py-3 px-4 font-semibold text-right">Shortage</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-primary-950">
                {availabilityLines.map((line) => (
                  <tr key={line.productId} className="hover:bg-primary-950/[0.02]">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-primary-950">{line.productName}</span>
                      <span className="text-[10px] text-primary-800/60 block font-mono">{line.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary-950">{line.demandQty}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary-950">
                      {line.availableQty}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {line.reservedQty}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {line.shortage > 0 ? (
                        <span className="font-bold text-rose-600">-{line.shortage}</span>
                      ) : (
                        <span className="text-primary-800/40">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {line.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-600/10 px-2 py-0.5 rounded border border-emerald-600/20">
                          <CheckCircle className="w-3 h-3" /> Fully Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" /> Shortage
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Shipment Items Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-primary-950/10 flex items-center justify-between bg-primary-950/[0.02]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-900" />
            <h3 className="text-sm font-bold text-primary-950">Shipment Product Lines</h3>
          </div>
          <div className="text-xs text-primary-800/60">
            Total Demand: <span className="text-primary-900 font-bold">{totalDemand}</span> units
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px] bg-primary-950/[0.01]">
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold text-right">Demand Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Shipped Qty</th>
                <th className="py-3 px-4 font-semibold">UoM</th>
                <th className="py-3 px-4 font-semibold text-right">Line State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-950/5 text-primary-950">
              {delivery.items && delivery.items.length > 0 ? (
                delivery.items.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-950/[0.02] transition-colors">
                    <td className="py-3 px-4 font-medium text-primary-950">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary-800/40" />
                        <span>{item.product?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-primary-800/60">
                      {item.product?.sku}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary-950">
                      {item.demandQty}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-primary-900">
                      {isDone ? item.demandQty : item.doneQty || 0}
                    </td>
                    <td className="py-3 px-4 text-primary-800/60">
                      {item.uom || item.product?.uom || 'Units'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Shipped
                        </span>
                      ) : isReady ? (
                        <span className="text-[11px] font-semibold text-emerald-700">Reserved</span>
                      ) : isWaiting ? (
                        <span className="text-[11px] font-semibold text-amber-700">Shortage</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-primary-800/50">Draft</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-primary-800/40">
                    No item lines recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Double-Entry Ledger Moves Audit (If Done) */}
      {isDone && delivery.stockMoves && delivery.stockMoves.length > 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-primary-950/10 flex items-center justify-between bg-primary-950/[0.02]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary-900" />
              <h3 className="text-sm font-bold text-primary-950">Stock Ledger Journal Entries</h3>
            </div>
            <span className="text-[11px] text-primary-800/60">Immutable Double-Entry Ledger</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">Move Reference</th>
                  <th className="py-2.5 px-4 font-semibold">Product</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-2.5 px-4 font-semibold">From Location</th>
                  <th className="py-2.5 px-4 font-semibold">To Location</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-primary-950">
                {delivery.stockMoves.map((sm) => (
                  <tr key={sm.id}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary-950">{sm.reference}</td>
                    <td className="py-2.5 px-4">{sm.product?.name} ({sm.product?.sku})</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">-{sm.quantity}</td>
                    <td className="py-2.5 px-4 text-primary-950">{sm.fromLocation?.name || 'Stock'}</td>
                    <td className="py-2.5 px-4 text-primary-800/60">{sm.toLocation?.name || 'Customers (External)'}</td>
                    <td className="py-2.5 px-4 text-right text-primary-800/40 text-[11px]">
                      {new Date(sm.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
      {/* Edit Modal */}
      {isDraft && (
        <DeliveryModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setDelivery(updated);
            showToast(`Delivery ${updated.reference} updated successfully.`);
          }}
          initialData={delivery}
          warehouses={warehouses}
          locations={locations}
          products={products}
        />
      )}

      {/* Validate Dialog */}
      <ConfirmDialog
        isOpen={isValidateDialogOpen}
        onClose={() => setIsValidateDialogOpen(false)}
        onConfirm={handleValidate}
        title={`Validate Delivery ${delivery.reference}`}
        message="Validating this delivery order will deduct outgoing product stock from warehouse inventory, release existing reservations, record double-entry moves, and mark the operation as completed."
        confirmText="Confirm & Ship Goods"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title={`Cancel Delivery ${delivery.reference}`}
        message="Are you sure you want to cancel this delivery order? Any reserved inventory quantities will be immediately released back to available stock."
        confirmText="Cancel Delivery"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default DeliveryDetailPage;
