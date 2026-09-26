import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { productsApi } from '../../api/products';
import { reorderRulesApi } from '../../api/reorderRules';
import { ProductReorderRuleItem, Location, Warehouse } from '../../types';

interface ReorderRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  initialRule?: ProductReorderRuleItem | null;
  locations: Location[];
  warehouses: Warehouse[];
}

export const ReorderRuleModal: React.FC<ReorderRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  initialRule,
  locations,
  warehouses,
}) => {
  const isEdit = Boolean(initialRule);

  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [minQuantity, setMinQuantity] = useState('10');
  const [maxQuantity, setMaxQuantity] = useState('50');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialRule) {
      setWarehouseId(initialRule.warehouseId);
      setLocationId(initialRule.locationId);
      setMinQuantity(String(initialRule.minQuantity));
      setMaxQuantity(String(initialRule.maxQuantity));
    } else {
      const defaultWh = warehouses.length > 0 ? warehouses[0].id : '';
      setWarehouseId(defaultWh);
      const loc = locations.find((l) => l.warehouseId === defaultWh);
      setLocationId(loc ? loc.id : '');
      setMinQuantity('10');
      setMaxQuantity('50');
    }
    setErrorMessage(null);
  }, [initialRule, isOpen, warehouses, locations]);

  const availableLocations = warehouseId
    ? locations.filter((l) => l.warehouseId === warehouseId)
    : locations;

  const handleWarehouseChange = (whId: string) => {
    setWarehouseId(whId);
    const loc = locations.find((l) => l.warehouseId === whId);
    setLocationId(loc ? loc.id : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const min = parseFloat(minQuantity);
    const max = parseFloat(maxQuantity);

    if (isNaN(min) || min < 0) {
      setErrorMessage('Minimum quantity must be a non-negative number.');
      return;
    }
    if (isNaN(max) || max < 0) {
      setErrorMessage('Maximum quantity must be a non-negative number.');
      return;
    }
    if (max < min) {
      setErrorMessage('Maximum quantity cannot be less than Minimum quantity.');
      return;
    }
    if (!isEdit && !locationId) {
      setErrorMessage('Please select a storage location.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit && initialRule) {
        await reorderRulesApi.updateRule(initialRule.id, {
          minQuantity: min,
          maxQuantity: max,
        });
      } else {
        await productsApi.createProductReorderRule(productId, {
          locationId,
          minQuantity: min,
          maxQuantity: max,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save reorder rule. Please check inputs.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Reorder Rule' : 'Add Automated Reorder Rule'}
      subtitle="Define threshold replenishment bounds for automatic low-stock alerts"
      size="md"
    >
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <>
            <Select
              label="Warehouse"
              value={warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.code})`,
              }))}
            />

            <Select
              label="Storage Location *"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={availableLocations.map((l) => ({
                value: l.id,
                label: `${l.name} (${l.code})`,
              }))}
              required
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Minimum Quantity *"
            type="number"
            min="0"
            step="1"
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value)}
            required
            helperText="Triggers Low Stock alert"
          />

          <Input
            label="Maximum Quantity *"
            type="number"
            min="0"
            step="1"
            value={maxQuantity}
            onChange={(e) => setMaxQuantity(e.target.value)}
            required
            helperText="Target restock ceiling"
          />
        </div>

        <div className="mt-6 pt-4 border-t border-primary-950/10 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
