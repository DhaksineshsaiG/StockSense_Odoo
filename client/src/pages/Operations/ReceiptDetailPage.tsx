import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Clock,
  Package,
  Layers,
  History,
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
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

export const ReceiptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState<OperationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchReceipt = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await receiptsApi.getReceiptById(id);
      setReceipt(data);
    } catch (err: any) {
      console.error('Failed to load receipt details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  // Load lookup data in background for edit modal
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

  const handleValidate = async () => {
    if (!receipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receiptsApi.validateReceipt(receipt.id);
      setReceipt(updated);
      setIsValidateDialogOpen(false);
      showToast(`Receipt ${receipt.reference} validated successfully. Stock levels increased!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate receipt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!receipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receiptsApi.cancelReceipt(receipt.id);
      setReceipt(updated);
      setIsCancelDialogOpen(false);
      showToast(`Receipt ${receipt.reference} canceled.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel receipt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <LoadingSkeleton lines={2} />
        </div>
        <GlassCard className="p-6">
          <LoadingSkeleton lines={6} />
        </GlassCard>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-primary-950/60 mb-4">Receipt document not found.</p>
        <Button variant="secondary" onClick={() => navigate('/operations/receipts')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Receipts
        </Button>
      </div>
    );
  }

  const isDraft = receipt.status === 'DRAFT';
  const isReady = receipt.status === 'READY';
  const isDone = receipt.status === 'DONE';
  const isCanceled = receipt.status === 'CANCELED';
  const canValidate = isDraft || isReady;
  const canCancel = isDraft || isReady;
  const canEdit = isDraft;

  const totalDemand = receipt.items?.reduce((sum, it) => sum + it.demandQty, 0) ?? 0;
  const totalReceived = receipt.items?.reduce((sum, it) => sum + (it.doneQty || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/receipts"
            className="p-2 rounded-xl bg-primary-950/5 border border-primary-950/10 text-primary-800/70 hover:text-primary-950 hover:bg-primary-950/10 transition-colors"
            title="Back to Receipts"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-primary-950 tracking-tight">{receipt.reference}</span>
              <StatusBadge status={receipt.status} size="sm" />
            </div>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Incoming Vendor Delivery Document • Created on{' '}
              {new Date(receipt.createdAt).toLocaleString()}
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

          {canValidate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsValidateDialogOpen(true)}
              className="!bg-emerald-700 hover:!bg-emerald-800 !text-ivory-100 !text-xs shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Validate Receipt
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
              <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Stock Received & Committed
            </div>
          )}

          {isCanceled && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Canceled (No stock added)
            </div>
          )}
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendor */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Vendor / Supplier
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {receipt.partnerName || 'Generic Supplier'}
            </span>
          </div>
        </GlassCard>

        {/* Destination Location */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900 flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Destination Location
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {receipt.destLocation?.name || 'Stock Location'}
            </span>
            <span className="text-[10px] text-primary-800/50 block font-mono">
              {receipt.destLocation?.code} ({receipt.warehouse?.name})
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
              Scheduled Date
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {receipt.scheduledDate
                ? new Date(receipt.scheduledDate).toLocaleDateString()
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
              {receipt.responsible?.name || 'System Operator'}
            </span>
            <span className="text-[10px] text-primary-800/50 block truncate">
              {receipt.responsible?.email || 'Automatic'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Notes / Remarks if present */}
      {receipt.notes && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-950 mb-1">
            <FileText className="w-3.5 h-3.5 text-primary-800/60" />
            <span>Operation Notes</span>
          </div>
          <p className="text-xs text-primary-800/80 whitespace-pre-wrap">{receipt.notes}</p>
        </GlassCard>
      )}

      {/* Expected Product Lines Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-primary-950/10 flex items-center justify-between bg-primary-950/[0.02]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-primary-950">Expected Product Lines</h3>
          </div>
          <div className="text-xs text-primary-800/60">
            Demand: <span className="text-primary-950 font-bold">{totalDemand}</span> units • Received:{' '}
            <span className="text-emerald-700 font-bold">{isDone ? totalDemand : totalReceived}</span> units
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px] bg-primary-950/[0.01]">
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold text-right">Demand Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Done Qty</th>
                <th className="py-3 px-4 font-semibold">UoM</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-950/5 text-primary-950">
              {receipt.items && receipt.items.length > 0 ? (
                receipt.items.map((item) => (
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
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {isDone ? item.demandQty : item.doneQty || 0}
                    </td>
                    <td className="py-3 px-4 text-primary-800/60">
                      {item.uom || item.product?.uom || 'Units'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> Received
                        </span>
                      ) : isCanceled ? (
                        <span className="text-[11px] font-semibold text-rose-600">Canceled</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-700">Pending</span>
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
      {isDone && receipt.stockMoves && receipt.stockMoves.length > 0 && (
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
                {receipt.stockMoves.map((sm) => (
                  <tr key={sm.id}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary-950">{sm.reference}</td>
                    <td className="py-2.5 px-4">{sm.product?.name} ({sm.product?.sku})</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700">+{sm.quantity}</td>
                    <td className="py-2.5 px-4 text-primary-800/60">{sm.fromLocation?.name || 'Vendors (External)'}</td>
                    <td className="py-2.5 px-4 text-emerald-800 font-medium">{sm.toLocation?.name || 'Stock'}</td>
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
        <ReceiptModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setReceipt(updated);
            showToast(`Receipt ${updated.reference} updated successfully.`);
          }}
          initialData={receipt}
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
        title={`Validate Receipt ${receipt.reference}`}
        message="Validating this receipt will commit inbound product quantities into internal warehouse stock. This operation creates immutable ledger entries and marks the receipt as completed."
        confirmText="Confirm & Receive Stock"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title={`Cancel Receipt ${receipt.reference}`}
        message="Are you sure you want to cancel this receipt? It has not been completed, so no stock will be added to your inventory."
        confirmText="Cancel Receipt"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default ReceiptDetailPage;
