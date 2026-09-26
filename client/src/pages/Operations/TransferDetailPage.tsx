import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Package,
  Layers,
  History,
  ArrowRight,
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
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

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState<OperationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modals & Dialogs
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Lookups
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTransfer = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await transfersApi.getTransferById(id);
      setTransfer(data);
    } catch (err: any) {
      console.error('Failed to load internal transfer details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransfer();
  }, [fetchTransfer]);

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
    if (!transfer) return;
    setIsActionLoading(true);
    try {
      const updated = await transfersApi.validateTransfer(transfer.id);
      setTransfer(updated);
      setIsValidateDialogOpen(false);
      showToast(`Transfer ${transfer.reference} validated. Stock moved successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate internal transfer.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    setIsActionLoading(true);
    try {
      const updated = await transfersApi.cancelTransfer(transfer.id);
      setTransfer(updated);
      setIsCancelDialogOpen(false);
      showToast(`Transfer ${transfer.reference} canceled.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel transfer.');
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

  if (!transfer) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-primary-950/60 mb-4">Internal transfer document not found.</p>
        <Button variant="secondary" onClick={() => navigate('/operations/transfers')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Transfers
        </Button>
      </div>
    );
  }

  const isDraft = transfer.status === 'DRAFT';
  const isReady = transfer.status === 'READY';
  const isDone = transfer.status === 'DONE';
  const isCanceled = transfer.status === 'CANCELED';

  const canEdit = isDraft;
  const canValidate = isDraft || isReady;
  const canCancel = isDraft || isReady;

  const totalDemand = transfer.items?.reduce((sum, it) => sum + it.demandQty, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-primary-950/90 border border-primary-900 text-ivory-100 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/transfers"
            className="p-2 rounded-xl bg-primary-950/5 border border-primary-950/10 text-primary-800/70 hover:text-primary-950 hover:bg-primary-950/10 transition-colors"
            title="Back to Transfers"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-primary-950 tracking-tight">{transfer.reference}</span>
              <StatusBadge status={transfer.status} size="sm" />
            </div>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Internal Stock Relocation Document • Created on{' '}
              {new Date(transfer.createdAt).toLocaleString()}
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
              className="!bg-amber-800 hover:!bg-amber-900 !text-ivory-100 !text-xs shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Validate Transfer
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
              <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Stock Moved: Source → Destination
            </div>
          )}

          {isCanceled && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Canceled (No stock moved)
            </div>
          )}
        </div>
      </div>

      {/* Topology Transfer Path Card */}
      <GlassCard className="p-5 border-primary-950/10 bg-ivory-100/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Source Location */}
          <div className="flex-1 p-3.5 rounded-xl bg-ivory-50 border border-primary-950/10">
            <span className="text-[10px] text-primary-800/60 uppercase font-semibold block">
              Source Location (Origin)
            </span>
            <span className="text-sm font-bold text-primary-950 block mt-0.5">
              {transfer.sourceLocation?.name || 'Source Location'}
            </span>
            <span className="text-[11px] text-amber-800 font-mono block">
              {transfer.sourceLocation?.code} [{transfer.sourceLocation?.type}]
            </span>
          </div>

          {/* Transfer Flow Icon */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-950 shadow-sm">
              <ArrowRight className="w-5 h-5 hidden sm:block" />
              <ArrowLeftRight className="w-5 h-5 sm:hidden" />
            </div>
          </div>

          {/* Destination Location */}
          <div className="flex-1 p-3.5 rounded-xl bg-ivory-50 border border-primary-950/10">
            <span className="text-[10px] text-primary-800/60 uppercase font-semibold block">
              Destination Location (Target)
            </span>
            <span className="text-sm font-bold text-primary-950 block mt-0.5">
              {transfer.destLocation?.name || 'Destination Location'}
            </span>
            <span className="text-[11px] text-emerald-800 font-mono block">
              {transfer.destLocation?.code} [{transfer.destLocation?.type}]
            </span>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-primary-800/60 text-center sm:text-left">
          Warehouse: <span className="font-semibold text-primary-950">{transfer.warehouse?.name}</span> ({transfer.warehouse?.code}) • Total facility on-hand inventory remains unchanged.
        </div>
      </GlassCard>

      {/* Metadata Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scheduled Date */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900 flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Transfer Date
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {transfer.scheduledDate
                ? new Date(transfer.scheduledDate).toLocaleDateString()
                : 'Immediate'}
            </span>
          </div>
        </GlassCard>

        {/* Responsible */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-800 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Responsible
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {transfer.responsible?.name || 'System Operator'}
            </span>
            <span className="text-[10px] text-primary-800/50 block truncate">
              {transfer.responsible?.email || 'Automatic'}
            </span>
          </div>
        </GlassCard>

        {/* Total Quantity */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 flex-shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Total Units Relocated
            </span>
            <span className="text-xs font-bold text-emerald-800 truncate block mt-0.5">
              {totalDemand} Units
            </span>
            <span className="text-[10px] text-primary-800/50 block">
              {transfer.items?.length || 0} unique line item(s)
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Notes */}
      {transfer.notes && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-950 mb-1">
            <FileText className="w-3.5 h-3.5 text-primary-800/60" />
            <span>Transfer Reason / Instructions</span>
          </div>
          <p className="text-xs text-primary-800/80 whitespace-pre-wrap">{transfer.notes}</p>
        </GlassCard>
      )}

      {/* Item Lines Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-primary-950/10 flex items-center justify-between bg-primary-950/[0.02]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-800" />
            <h3 className="text-sm font-bold text-primary-950">Transfer Product Lines</h3>
          </div>
          <div className="text-xs text-primary-800/60">
            Total Demand: <span className="text-amber-800 font-bold">{totalDemand}</span> units
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px] bg-primary-950/[0.01]">
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold text-right">Quantity to Move</th>
                <th className="py-3 px-4 font-semibold text-right">Transferred Qty</th>
                <th className="py-3 px-4 font-semibold">UoM</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-950/5 text-primary-950">
              {transfer.items && transfer.items.length > 0 ? (
                transfer.items.map((item) => (
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
                    <td className="py-3 px-4 text-right font-semibold text-amber-800">
                      {isDone ? item.demandQty : item.doneQty || 0}
                    </td>
                    <td className="py-3 px-4 text-primary-800/60">
                      {item.uom || item.product?.uom || 'Units'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Moved
                        </span>
                      ) : isCanceled ? (
                        <span className="text-[11px] font-semibold text-rose-600">Canceled</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-700">Draft</span>
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
      {isDone && transfer.stockMoves && transfer.stockMoves.length > 0 && (
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
                {transfer.stockMoves.map((sm) => (
                  <tr key={sm.id}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary-950">{sm.reference}</td>
                    <td className="py-2.5 px-4">{sm.product?.name} ({sm.product?.sku})</td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-800">{sm.quantity}</td>
                    <td className="py-2.5 px-4 text-primary-800/70">{sm.fromLocation?.name}</td>
                    <td className="py-2.5 px-4 text-emerald-800 font-medium">{sm.toLocation?.name}</td>
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
        <TransferModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setTransfer(updated);
            showToast(`Transfer ${updated.reference} updated successfully.`);
          }}
          initialData={transfer}
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
        title={`Validate Transfer ${transfer.reference}`}
        message="Validating will move stock from Source Location to Destination Location and create double-entry ledger entries. Total warehouse stock is invariant."
        confirmText="Confirm & Move Stock"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title={`Cancel Transfer ${transfer.reference}`}
        message="Are you sure you want to cancel this transfer? It has not been validated, so no stock will be relocated."
        confirmText="Cancel Transfer"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default TransferDetailPage;
