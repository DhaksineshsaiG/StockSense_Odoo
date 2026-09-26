import React, { useState, useEffect } from 'react';
import { Plus, Trash2, SlidersHorizontal, AlertCircle, ArrowUp, ArrowDown, Equal } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { adjustmentsApi } from '../../api/operations';
import { productsApi } from '../../api/products';
import {
  OperationRecord,
  Warehouse,
  Location,
  ProductListItem,
  CreateAdjustmentPayload,
  UpdateAdjustmentPayload,
} from '../../types';

interface AdjustmentItemRow {
  productId: string;
  recordedQty: number;
  physicalQty: string;
  uom: string;
  isFetchingRecorded?: boolean;
}

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adjustment: OperationRecord) => void;
  initialData?: OperationRecord | null;
  warehouses: Warehouse[];
  locations: Location[];
  products: ProductListItem[];
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
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
  const [locationId, setLocationId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<AdjustmentItemRow[]>([
    { productId: '', recordedQty: 0, physicalQty: '0', uom: 'Units' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableLocations = warehouseId
    ? locations.filter((loc) => loc.warehouseId === warehouseId)
    : locations;

  // Helper to fetch live recorded quantity for a product at a specific location
  const fetchProductLocationStock = async (prodId: string, locId: string): Promise<number> => {
    if (!prodId || !locId) return 0;
    try {
      const prodDetail = await productsApi.getProductById(prodId);
      const match = prodDetail.stock?.byLocation?.find((l) => l.locationId === locId);
      return match ? match.quantity : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (initialData) {
      setWarehouseId(initialData.warehouseId);
      // For adjustments, sourceLocationId or destLocationId stores the target location
      const loc = initialData.sourceLocationId || initialData.destLocationId || '';
      setLocationId(loc);
      setScheduledDate(
        initialData.scheduledDate
          ? new Date(initialData.scheduledDate).toISOString().split('T')[0]
          : ''
      );
      setNotes(initialData.notes || '');

      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((item) => {
            const rec = item.recordedQuantity ?? item.doneQty ?? 0;
            const phys = item.physicalQuantity ?? item.demandQty ?? rec;
            return {
              productId: item.productId,
              recordedQty: rec,
              physicalQty: String(phys),
              uom: item.uom || item.product?.uom || 'Units',
            };
          })
        );
      } else {
        setItems([{ productId: '', recordedQty: 0, physicalQty: '0', uom: 'Units' }]);
      }
    } else {
      const defaultWh = warehouses.length > 0 ? warehouses[0].id : '';
      setWarehouseId(defaultWh);

      const whLocs = locations.filter((loc) => loc.warehouseId === defaultWh);
      const stockLoc = whLocs.find(
        (l) => l.type === 'INTERNAL' || l.code.includes('STOCK') || l.name.toLowerCase().includes('stock')
      );
      const initialLoc = stockLoc ? stockLoc.id : whLocs[0]?.id || '';
      setLocationId(initialLoc);

      setScheduledDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      const firstProd = products[0];
      const initialRow: AdjustmentItemRow = {
        productId: firstProd?.id || '',
        recordedQty: 0,
        physicalQty: '0',
        uom: firstProd?.uom || 'Units',
      };
      setItems([initialRow]);

      if (firstProd?.id && initialLoc) {
        fetchProductLocationStock(firstProd.id, initialLoc).then((qty) => {
          setItems([
            {
              productId: firstProd.id,
              recordedQty: qty,
              physicalQty: String(qty),
              uom: firstProd.uom || 'Units',
            },
          ]);
        });
      }
    }
    setErrorMessage(null);
  }, [initialData, isOpen, warehouses, locations, products]);

  const handleWarehouseChange = (newWhId: string) => {
    setWarehouseId(newWhId);
    const whLocs = locations.filter((loc) => loc.warehouseId === newWhId);
    const stockLoc = whLocs.find(
      (l) => l.type === 'INTERNAL' || l.code.includes('STOCK') || l.name.toLowerCase().includes('stock')
    );
    const newLocId = stockLoc ? stockLoc.id : whLocs[0]?.id || '';
    setLocationId(newLocId);

    // Refresh recorded quantities for current items
    if (newLocId) {
      items.forEach((item, idx) => {
        if (item.productId) {
          fetchProductLocationStock(item.productId, newLocId).then((qty) => {
            setItems((curr) => {
              const updated = [...curr];
              if (updated[idx]) {
                updated[idx].recordedQty = qty;
              }
              return updated;
            });
          });
        }
      });
    }
  };

  const handleLocationChange = (newLocId: string) => {
    setLocationId(newLocId);
    if (newLocId) {
      items.forEach((item, idx) => {
        if (item.productId) {
          fetchProductLocationStock(item.productId, newLocId).then((qty) => {
            setItems((curr) => {
              const updated = [...curr];
              if (updated[idx]) {
                updated[idx].recordedQty = qty;
              }
              return updated;
            });
          });
        }
      });
    }
  };

  const handleProductChange = async (index: number, newProductId: string) => {
    const selectedProd = products.find((p) => p.id === newProductId);
    const recQty = locationId ? await fetchProductLocationStock(newProductId, locationId) : 0;

    const updated = [...items];
    updated[index] = {
      productId: newProductId,
      recordedQty: recQty,
      physicalQty: String(recQty),
      uom: selectedProd?.uom || 'Units',
    };
    setItems(updated);
  };

  const handlePhysicalQtyChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].physicalQty = val;
    setItems(updated);
  };

  const addItemRow = async () => {
    const nextProd = products.find((p) => !items.some((i) => i.productId === p.id)) || products[0];
    const recQty = nextProd && locationId ? await fetchProductLocationStock(nextProd.id, locationId) : 0;
    setItems([
      ...items,
      {
        productId: nextProd?.id || '',
        recordedQty: recQty,
        physicalQty: String(recQty),
        uom: nextProd?.uom || 'Units',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!warehouseId) {
      setErrorMessage('Please select a warehouse.');
      return;
    }
    if (!locationId) {
      setErrorMessage('Please select an inventory location.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('At least one item line is required.');
      return;
    }

    const parsedItems: Array<{
      productId: string;
      physicalQuantity: number;
      recordedQuantity?: number;
      uom?: string;
    }> = [];
    const seen = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setErrorMessage(`Please select a product for row #${i + 1}.`);
        return;
      }
      if (seen.has(it.productId)) {
        setErrorMessage(`Product appears multiple times in lines (Row #${i + 1}).`);
        return;
      }
      seen.add(it.productId);

      const phys = parseFloat(it.physicalQty);
      if (isNaN(phys) || phys < 0) {
        setErrorMessage(`Physical count for row #${i + 1} must be 0 or greater.`);
        return;
      }

      parsedItems.push({
        productId: it.productId,
        physicalQuantity: phys,
        recordedQuantity: it.recordedQty,
        uom: it.uom || undefined,
      });
    }

    setIsLoading(true);
    try {
      if (isEdit && initialData) {
        const payload: UpdateAdjustmentPayload = {
          locationId,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          items: parsedItems,
        };
        const updated = await adjustmentsApi.updateAdjustment(initialData.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreateAdjustmentPayload = {
          warehouseId,
          locationId,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          items: parsedItems,
        };
        const created = await adjustmentsApi.createAdjustment(payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save inventory adjustment. Please check your inputs.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Inventory Adjustment: ${initialData?.reference}` : 'New Inventory Adjustment'}
      subtitle={
        isEdit
          ? 'Update physical inventory count and notes'
          : 'Reconcile physical stock counts with system recorded quantities'
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
        {/* Header Fields */}
        <div className="p-4 rounded-xl bg-ivory-100 border border-primary-950/10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-950">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Target Facility & Location</span>
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
              label="Physical Stock Location *"
              value={locationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              options={availableLocations.map((l) => ({
                value: l.id,
                label: `${l.name} (${l.code}) [${l.type}]`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Audit Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />

            <Input
              label="Reason / Notes (Optional)"
              placeholder="e.g. Annual physical count, breakage reconciliation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Physical vs Recorded Comparison Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-primary-950 tracking-wide uppercase">
                Physical Inventory Counts ({items.length})
              </h4>
              <p className="text-[11px] text-primary-800/60">
                Enter actual physical count. The system calculates the stock adjustment delta automatically.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addItemRow}
              className="!text-xs !py-1 !px-2.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
            </Button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {items.map((row, idx) => {
              const selectedProduct = products.find((p) => p.id === row.productId);
              const physNum = parseFloat(row.physicalQty) || 0;
              const diff = physNum - row.recordedQty;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-ivory-100 border border-primary-950/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="w-6 text-center text-xs font-bold text-primary-800/40 flex-shrink-0">
                    #{idx + 1}
                  </div>

                  {/* Product Picker */}
                  <div className="flex-1 min-w-[190px]">
                    <select
                      value={row.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ivory-50 border border-primary-950/15 text-primary-950 focus:outline-none focus:ring-1 focus:ring-primary-900"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Recorded Quantity (Read-only badge) */}
                  <div className="w-24 flex-shrink-0 text-center">
                    <span className="block text-[10px] text-primary-800/60 mb-0.5">Recorded</span>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-ivory-200/60 border border-primary-950/10 text-xs font-medium text-primary-950">
                      {row.recordedQty} {selectedProduct?.uom || row.uom}
                    </span>
                  </div>

                  {/* Physical Count Input */}
                  <div className="w-28 flex-shrink-0">
                    <span className="block text-[10px] text-primary-800/60 mb-0.5 text-center">
                      Physical Count
                    </span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={row.physicalQty}
                      onChange={(e) => handlePhysicalQtyChange(idx, e.target.value)}
                      className="!text-center font-bold"
                    />
                  </div>

                  {/* Difference Badge */}
                  <div className="w-28 flex-shrink-0 text-center">
                    <span className="block text-[10px] text-primary-800/60 mb-0.5">Difference</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
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
            {isEdit ? 'Save Changes' : 'Create Adjustment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AdjustmentModal;
