import React, { useState, useEffect } from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { productsApi } from '../../api/products';
import { ProductDetail, Warehouse, Location } from '../../types';

interface SetStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: ProductDetail;
  warehouses: Warehouse[];
  locations: Location[];
}

export const SetStockModal: React.FC<SetStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
  warehouses,
  locations,
}) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialWh = warehouses.length > 0 ? warehouses[0].id : '';
      setWarehouseId(initialWh);

      // Find first location in this warehouse
      const firstLoc = locations.find((l) => l.warehouseId === initialWh);
      setLocationId(firstLoc ? firstLoc.id : '');
      setQuantity('0');
      setErrorMessage(null);
    }
  }, [isOpen, warehouses, locations]);

  const availableLocations = warehouseId
    ? locations.filter((loc) => loc.warehouseId === warehouseId)
    : locations;

  const handleWarehouseChange = (whId: string) => {
    setWarehouseId(whId);
    const loc = locations.find((l) => l.warehouseId === whId);
    setLocationId(loc ? loc.id : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) {
      setErrorMessage('Quantity must be a valid non-negative number.');
      return;
    }

    if (!locationId && !warehouseId) {
      setErrorMessage('Please select a target location or warehouse.');
      return;
    }

    setIsLoading(true);
    try {
      await productsApi.setProductStock(product.id, {
        locationId: locationId || undefined,
        warehouseId: warehouseId || undefined,
        quantity: qty,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to set stock level. Please check target location.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Direct Stock Quant Override"
      subtitle={`Set physical on-hand stock for ${product.name} (${product.sku})`}
      size="md"
    >
      {/* Notice Callout */}
      <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold text-primary-950">Direct Stock Level Mutation:</span>
          <p className="mt-0.5 text-primary-800/70 text-[11px] leading-relaxed">
            This action directly sets the physical StockQuant balance for this specific location.
            For official journal audits with move reason lines, use the Inventory Adjustment module.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Target Warehouse"
          value={warehouseId}
          onChange={(e) => handleWarehouseChange(e.target.value)}
          options={warehouses.map((w) => ({
            value: w.id,
            label: `${w.name} (${w.code})`,
          }))}
        />

        <Select
          label="Specific Location *"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          options={availableLocations.map((l) => ({
            value: l.id,
            label: `${l.name} (${l.code}) [${l.type}]`,
          }))}
          required
        />

        <div>
          <Input
            label={`New On-Hand Quantity (${product.uom || 'Units'}) *`}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            helperText="Overrides the current quantity on hand for this location"
          />
        </div>

        <div className="mt-6 pt-4 border-t border-primary-950/10 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Layers className="w-3.5 h-3.5" />}
          >
            Update Stock Level
          </Button>
        </div>
      </form>
    </Modal>
  );
};
