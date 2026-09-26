import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { receiptsApi } from '../../api/operations';
import {
  OperationRecord,
  Warehouse,
  Location,
  ProductListItem,
  CreateReceiptPayload,
  UpdateReceiptPayload,
} from '../../types';

interface ItemRow {
  productId: string;
  demandQty: string;
  uom: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receipt: OperationRecord) => void;
  initialData?: OperationRecord | null;
  warehouses: Warehouse[];
  locations: Location[];
  products: ProductListItem[];
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  warehouses,
  locations,
  products,
}) => {
  const isEdit = Boolean(initialData);

  const [warehouseId, setWarehouseId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', demandQty: '1', uom: 'Units' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available locations for the chosen warehouse (prefer INTERNAL or RECEIVING)
  const availableLocations = warehouseId
    ? locations.filter((loc) => loc.warehouseId === warehouseId)
    : locations;

  useEffect(() => {
    if (initialData) {
      setWarehouseId(initialData.warehouseId);
      setDestLocationId(initialData.destLocationId || '');
      setPartnerName(initialData.partnerName || '');
      setScheduledDate(
        initialData.scheduledDate
          ? new Date(initialData.scheduledDate).toISOString().split('T')[0]
          : ''
      );
      setNotes(initialData.notes || '');

      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((item) => ({
            productId: item.productId,
            demandQty: String(item.demandQty),
            uom: item.uom || item.product?.uom || 'Units',
          }))
        );
      } else {
        setItems([{ productId: '', demandQty: '1', uom: 'Units' }]);
      }
    } else {
      const defaultWh = warehouses.length > 0 ? warehouses[0].id : '';
      setWarehouseId(defaultWh);

      // Default dest location: find first INTERNAL or stock location in default warehouse
      const defaultLocs = locations.filter((loc) => loc.warehouseId === defaultWh);
      const stockLoc = defaultLocs.find(
        (l) => l.type === 'INTERNAL' || l.code.includes('STOCK') || l.name.toLowerCase().includes('stock')
      );
      setDestLocationId(stockLoc ? stockLoc.id : defaultLocs[0]?.id || '');

      setPartnerName('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItems([{ productId: products[0]?.id || '', demandQty: '1', uom: products[0]?.uom || 'Units' }]);
    }
    setErrorMessage(null);
  }, [initialData, isOpen, warehouses, locations, products]);

  // When warehouse changes, update dest location to one within that warehouse
  const handleWarehouseChange = (newWhId: string) => {
    setWarehouseId(newWhId);
    const whLocs = locations.filter((loc) => loc.warehouseId === newWhId);
    const stockLoc = whLocs.find(
      (l) => l.type === 'INTERNAL' || l.code.includes('STOCK') || l.name.toLowerCase().includes('stock')
    );
    setDestLocationId(stockLoc ? stockLoc.id : whLocs[0]?.id || '');
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProd = products.find((p) => p.id === newProductId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      uom: selectedProd?.uom || updated[index].uom || 'Units',
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qtyStr: string) => {
    const updated = [...items];
    updated[index].demandQty = qtyStr;
    setItems(updated);
  };

  const addItemRow = () => {
    const nextProd = products.find((p) => !items.some((i) => i.productId === p.id)) || products[0];
    setItems([
      ...items,
      {
        productId: nextProd?.id || '',
        demandQty: '1',
        uom: nextProd?.uom || 'Units',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalDemandQty = items.reduce((acc, curr) => acc + (parseFloat(curr.demandQty) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!warehouseId) {
      setErrorMessage('Please select a warehouse.');
      return;
    }
    if (!destLocationId) {
      setErrorMessage('Please select a destination storage location.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('At least one item line is required.');
      return;
    }

    // Validate item lines
    const parsedItems: Array<{ productId: string; demandQty: number; uom?: string }> = [];
    const seenProducts = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        setErrorMessage(`Please select a valid product for row #${i + 1}.`);
        return;
      }
      if (seenProducts.has(item.productId)) {
        setErrorMessage(
          `Product appears multiple times in lines (Row #${i + 1}). Combine quantities instead.`
        );
        return;
      }
      seenProducts.add(item.productId);

      const qty = parseFloat(item.demandQty);
      if (isNaN(qty) || qty <= 0) {
        setErrorMessage(`Demand quantity for row #${i + 1} must be a positive number.`);
        return;
      }

      parsedItems.push({
        productId: item.productId,
        demandQty: qty,
        uom: item.uom || undefined,
      });
    }

    setIsLoading(true);
    try {
      if (isEdit && initialData) {
        const payload: UpdateReceiptPayload = {
          destLocationId,
          partnerName: partnerName.trim() || undefined,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          items: parsedItems,
        };
        const updated = await receiptsApi.updateReceipt(initialData.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreateReceiptPayload = {
          warehouseId,
          destLocationId,
          partnerName: partnerName.trim() || undefined,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          items: parsedItems,
        };
        const created = await receiptsApi.createReceipt(payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save incoming receipt. Please review your entries.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Receipt: ${initialData?.reference}` : 'Create Incoming Receipt'}
      subtitle={
        isEdit
          ? 'Modify draft receipt details and expected product lines'
          : 'Record inbound vendor delivery to increase internal warehouse stock upon validation'
      }
      size="xl"
    >
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Document Header Fields */}
        <div className="p-4 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Document Header & Destination</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Warehouse *"
              value={warehouseId}
              disabled={isEdit}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.code})`,
              }))}
            />

            <Select
              label="Destination Location *"
              value={destLocationId}
              onChange={(e) => setDestLocationId(e.target.value)}
              options={availableLocations.map((l) => ({
                value: l.id,
                label: `${l.name} (${l.code}) [${l.type}]`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Vendor / Partner Name (Optional)"
              placeholder="e.g. Acme Supplies Ltd."
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />

            <Input
              label="Scheduled Inbound Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-950 mb-1.5">
              Operation Notes / Source PO (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Vendor PO #45129 - Container 4A"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-ivory-50 border border-primary-950/15 text-primary-950 placeholder-primary-800/40 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-primary-950 tracking-wide uppercase">
                Expected Product Lines ({items.length})
              </h4>
              <p className="text-[11px] text-primary-800/60">
                Specify quantities to receive. Total Demand:{' '}
                <span className="text-emerald-700 font-semibold">{totalDemandQty}</span> units
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addItemRow}
              className="!text-xs !py-1 !px-2.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((row, idx) => {
              const selectedProduct = products.find((p) => p.id === row.productId);

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-ivory-100 border border-primary-950/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="w-6 text-center text-xs font-bold text-primary-800/40 flex-shrink-0">
                    #{idx + 1}
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <select
                      value={row.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ivory-50 border border-primary-950/15 text-primary-950 focus:outline-none focus:ring-1 focus:ring-primary-900"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({p.totalOnHand} on hand)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28 flex-shrink-0">
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="Qty"
                      value={row.demandQty}
                      onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    />
                  </div>

                  <div className="w-24 flex-shrink-0">
                    <input
                      type="text"
                      disabled
                      value={selectedProduct?.uom || row.uom || 'Units'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ivory-200/50 border border-primary-950/10 text-primary-800/60 text-center"
                    />
                  </div>

                  <div className="flex items-center justify-end sm:justify-center">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 rounded-lg text-primary-800/40 hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-20 disabled:hover:text-primary-800/40 disabled:hover:bg-transparent transition-colors"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-primary-950/10 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Receipt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReceiptModal;
