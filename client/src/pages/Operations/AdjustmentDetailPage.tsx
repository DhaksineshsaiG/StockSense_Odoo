import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
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
  ArrowUp,
  ArrowDown,
  Equal,
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
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

export const AdjustmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [adjustment, setAdjustment] = useState<OperationRecord | null>(null);
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

  const fetchAdjustment = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await adjustmentsApi.getAdjustmentById(id);
      setAdjustment(data);
    } catch (err: any) {
      console.error('Failed to load adjustment details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAdjustment();
  }, [fetchAdjustment]);

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
    if (!adjustment) return;
    setIsActionLoading(true);
    try {
      const updated = await adjustmentsApi.validateAdjustment(adjustment.id);
      setAdjustment(updated);
      setIsValidateDialogOpen(false);
      showToast(`Adjustment ${adjustment.reference} validated. Stock reconciled.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to validate adjustment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!adjustment) return;
    setIsActionLoading(true);
    try {
      const updated = await adjustmentsApi.cancelAdjustment(adjustment.id);
      setAdjustment(updated);
      setIsCancelDialogOpen(false);
      showToast(`Adjustment ${adjustment.reference} canceled.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel adjustment.');
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

  if (!adjustment) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-primary-950/60 mb-4">Inventory adjustment document not found.</p>
        <Button variant="secondary" onClick={() => navigate('/operations/adjustments')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Adjustments
        </Button>
      </div>
    );
  }

  const isDraft = adjustment.status === 'DRAFT';
  const isDone = adjustment.status === 'DONE';
  const isCanceled = adjustment.status === 'CANCELED';

  const canEdit = isDraft;
  const canValidate = isDraft;
  const canCancel = isDraft;

  const targetLocation = adjustment.destLocation || adjustment.sourceLocation;

  // Calculate net difference
  const totalDifference = adjustment.items?.reduce((acc, it) => {
    const recorded = it.recordedQuantity ?? it.doneQty ?? 0;
    const physical = it.physicalQuantity ?? it.demandQty ?? 0;
    const diff = it.difference ?? physical - recorded;
    return acc + diff;
  }, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-primary-950 text-ivory-100 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fadeIn border border-primary-800/40">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/operations/adjustments"
            className="p-2 rounded-xl bg-ivory-100 border border-primary-950/15 text-primary-800 hover:text-primary-950 hover:bg-ivory-200 transition-colors shadow-sm"
            title="Back to Adjustments"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-primary-950 tracking-tight">{adjustment.reference}</span>
              <StatusBadge status={adjustment.status} size="sm" />
            </div>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Inventory Cycle Count & Stock Reconciliation Document • Created on{' '}
              {new Date(adjustment.createdAt).toLocaleString()}
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
              className="!text-xs shadow-md shadow-primary-950/10"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Validate Adjustment
            </Button>
          )}

          {canCancel && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCancelDialogOpen(true)}
              className="!text-xs !text-rose-600 hover:!bg-rose-500/10 hover:!border-rose-500/30"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
          )}

          {isDone && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Stock Reconciled & Saved to Ledger
            </div>
          )}

          {isCanceled && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Canceled (No stock change)
            </div>
          )}
        </div>
      </div>

      {/* Difference Summary Alert */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          totalDifference > 0
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
            : totalDifference < 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-900'
            : 'bg-ivory-100 border-primary-950/10 text-primary-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              totalDifference > 0
                ? 'bg-emerald-500/20 text-emerald-700'
                : totalDifference < 0
                ? 'bg-rose-500/20 text-rose-700'
                : 'bg-primary-950/10 text-primary-800'
            }`}
          >
            {totalDifference > 0 ? (
              <ArrowUp className="w-5 h-5" />
            ) : totalDifference < 0 ? (
              <ArrowDown className="w-5 h-5" />
            ) : (
              <Equal className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="font-bold text-primary-950 block text-sm">
              {totalDifference > 0
                ? `Inventory Surplus (+${totalDifference} Units)`
                : totalDifference < 0
                ? `Inventory Loss / Shrinkage (${totalDifference} Units)`
                : 'Perfect Match (0 Net Difference)'}
            </span>
            <span className="text-xs text-primary-800/70">
              Adjustment changes recorded stock to match physical count upon validation.
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-semibold text-primary-800/60 block">
            Net Delta
          </span>
          <span
            className={`text-lg font-bold font-mono ${
              totalDifference > 0
                ? 'text-emerald-700'
                : totalDifference < 0
                ? 'text-rose-700'
                : 'text-primary-800'
            }`}
          >
            {totalDifference > 0 ? `+${totalDifference}` : totalDifference}
          </span>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Physical Location */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900 flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Audited Location
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {targetLocation?.name || 'Stock Location'}
            </span>
            <span className="text-[10px] text-primary-800/60 block font-mono">
              {targetLocation?.code} ({adjustment.warehouse?.name})
            </span>
          </div>
        </GlassCard>

        {/* Audit Date */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900 flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Count Date
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {adjustment.scheduledDate
                ? new Date(adjustment.scheduledDate).toLocaleDateString()
                : 'Immediate'}
            </span>
          </div>
        </GlassCard>

        {/* Responsible */}
        <GlassCard className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-950/5 border border-primary-950/10 flex items-center justify-center text-primary-900 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-primary-800/60 uppercase tracking-wider block font-semibold">
              Responsible
            </span>
            <span className="text-xs font-bold text-primary-950 truncate block mt-0.5">
              {adjustment.responsible?.name || 'System Operator'}
            </span>
            <span className="text-[10px] text-primary-800/60 block truncate">
              {adjustment.responsible?.email || 'Automatic'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Notes */}
      {adjustment.notes && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-950 mb-1">
            <FileText className="w-3.5 h-3.5 text-primary-800/60" />
            <span>Audit Notes / Reconciliation Reason</span>
          </div>
          <p className="text-xs text-primary-800/80 whitespace-pre-wrap">{adjustment.notes}</p>
        </GlassCard>
      )}

      {/* Count Comparison Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-primary-950/10 flex items-center justify-between bg-primary-950/[0.02]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-900" />
            <h3 className="text-sm font-bold text-primary-950">Physical Count vs Recorded Quantities</h3>
          </div>
          <span className="text-xs text-primary-800/60">
            Total Audited Items: <span className="font-bold text-primary-950">{adjustment.items?.length || 0}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-primary-950/10 text-primary-800/60 text-[11px] bg-primary-950/[0.02]">
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold text-center">Recorded Quantity</th>
                <th className="py-3 px-4 font-semibold text-center">Physical Count</th>
                <th className="py-3 px-4 font-semibold text-center">Difference</th>
                <th className="py-3 px-4 font-semibold">UoM</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-950/5 text-primary-900">
              {adjustment.items && adjustment.items.length > 0 ? (
                adjustment.items.map((item) => {
                  const rec = item.recordedQuantity ?? item.doneQty ?? 0;
                  const phys = item.physicalQuantity ?? item.demandQty ?? 0;
                  const diff = item.difference ?? phys - rec;

                  return (
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
                      <td className="py-3 px-4 text-center font-medium text-primary-800">
                        {rec}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-primary-950">
                        {phys}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                            diff > 0
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                              : diff < 0
                              ? 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                              : 'bg-primary-950/5 text-primary-800 border-primary-950/10'
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
                      <td className="py-3 px-4 text-primary-800/60">
                        {item.uom || item.product?.uom || 'Units'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> Reconciled
                          </span>
                        ) : isCanceled ? (
                          <span className="text-[11px] font-semibold text-rose-700">Canceled</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-primary-900">Draft Audit</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-primary-800/40">
                    No count lines recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Double-Entry Ledger Moves Audit (If Done) */}
      {isDone && adjustment.stockMoves && adjustment.stockMoves.length > 0 && (
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
              <tbody className="divide-y divide-primary-950/5 text-primary-900">
                {adjustment.stockMoves.map((sm) => (
                  <tr key={sm.id}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-primary-950">{sm.reference}</td>
                    <td className="py-2.5 px-4">{sm.product?.name} ({sm.product?.sku})</td>
                    <td className="py-2.5 px-4 text-right font-bold text-primary-950">
                      {sm.quantity}
                    </td>
                    <td className="py-2.5 px-4 text-primary-800/60">{sm.fromLocation?.name || 'Inventory Loss'}</td>
                    <td className="py-2.5 px-4 text-primary-800/80">{sm.toLocation?.name || 'Stock'}</td>
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
        <AdjustmentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setAdjustment(updated);
            showToast(`Adjustment ${updated.reference} updated successfully.`);
          }}
          initialData={adjustment}
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
        title={`Validate Adjustment ${adjustment.reference}`}
        message="Validating this adjustment will update the recorded StockQuant to match the physical count and record inventory loss/gain StockMoves in the ledger. This operation is permanent."
        confirmText="Confirm & Reconcile Stock"
        variant="primary"
        isLoading={isActionLoading}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title={`Cancel Adjustment ${adjustment.reference}`}
        message="Are you sure you want to cancel this inventory adjustment? The recorded inventory quantities will not be changed."
        confirmText="Cancel Adjustment"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default AdjustmentDetailPage;
