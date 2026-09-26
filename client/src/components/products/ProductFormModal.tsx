import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { productsApi } from '../../api/products';
import {
  ProductDetail,
  CategoryItem,
  Warehouse,
  Location,
  CreateProductPayload,
  UpdateProductPayload,
} from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: ProductDetail) => void;
  initialData?: ProductDetail | null;
  categories: CategoryItem[];
  warehouses: Warehouse[];
  locations: Location[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  categories,
  warehouses,
  locations,
}) => {
  const isEdit = Boolean(initialData);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uom, setUom] = useState('Units');
  const [costPrice, setCostPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('0');

  // Initial stock for creation
  const [enableInitialStock, setEnableInitialStock] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('0');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSku(initialData.sku);
      setBarcode(initialData.barcode || '');
      setCategoryId(initialData.categoryId || '');
      setUom(initialData.uom || 'Units');
      setCostPrice(String(initialData.costPrice || 0));
      setSalePrice(String(initialData.salePrice || 0));
      setEnableInitialStock(false);
    } else {
      setName('');
      setSku('');
      setBarcode('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setUom('Units');
      setCostPrice('0');
      setSalePrice('0');
      setEnableInitialStock(false);
      setSelectedWarehouseId(warehouses.length > 0 ? warehouses[0].id : '');
      setSelectedLocationId('');
      setInitialQuantity('0');
    }
    setErrorMessage(null);
  }, [initialData, isOpen, categories, warehouses]);

  // Filter locations by selected warehouse for initial stock
  const filteredLocations = selectedWarehouseId
    ? locations.filter((loc) => loc.warehouseId === selectedWarehouseId)
    : locations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (!sku.trim()) {
      setErrorMessage('SKU is required.');
      return;
    }

    const parsedCost = parseFloat(costPrice) || 0;
    const parsedSale = parseFloat(salePrice) || 0;

    if (parsedCost < 0 || parsedSale < 0) {
      setErrorMessage('Prices cannot be negative.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit && initialData) {
        const payload: UpdateProductPayload = {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          barcode: barcode.trim() || null,
          categoryId: categoryId || null,
          uom: uom.trim() || 'Units',
          costPrice: parsedCost,
          salePrice: parsedSale,
        };

        const updated = await productsApi.updateProduct(initialData.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreateProductPayload = {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          barcode: barcode.trim() || null,
          categoryId: categoryId || null,
          uom: uom.trim() || 'Units',
          costPrice: parsedCost,
          salePrice: parsedSale,
        };

        if (enableInitialStock && parseFloat(initialQuantity) > 0) {
          payload.initialStock = [
            {
              locationId: selectedLocationId || undefined,
              warehouseId: selectedWarehouseId || undefined,
              quantity: parseFloat(initialQuantity),
            },
          ];
        }

        const created = await productsApi.createProduct(payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save product. Please check your inputs.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Product: ${initialData?.name}` : 'Add New Product'}
      subtitle={
        isEdit
          ? 'Update product specifications and pricing'
          : 'Create a new inventory catalog item'
      }
      size="lg"
    >
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name *"
            placeholder="e.g. Steel Pipe 2-inch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="SKU Code *"
            placeholder="e.g. STL-PIPE-001"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            required
            helperText="Uppercase unique stock keeping unit"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={[
              { value: '', label: 'Uncategorized' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Input
            label="Barcode (Optional)"
            placeholder="e.g. 890123456789"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />

          <Input
            label="Unit of Measure (UoM)"
            placeholder="e.g. Units, kg, m"
            value={uom}
            onChange={(e) => setUom(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Cost Price ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />

          <Input
            label="Sale Price ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </div>

        {/* Optional Initial Stock Section (Creation Only) */}
        {!isEdit && (
          <div className="pt-3 border-t border-primary-950/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-xs font-semibold text-primary-950">
                  Record Initial Stock
                </label>
                <p className="text-[11px] text-primary-800/60">
                  Optional: Seed on-hand inventory immediately upon creation
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableInitialStock}
                onChange={(e) => setEnableInitialStock(e.target.checked)}
                className="w-4 h-4 rounded text-primary-950 bg-ivory-100 border-primary-950/20 focus:ring-primary-800 cursor-pointer"
              />
            </div>

            {enableInitialStock && (
              <div className="p-3.5 rounded-xl bg-primary-950/[0.03] border border-primary-950/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label="Target Warehouse"
                    value={selectedWarehouseId}
                    onChange={(e) => {
                      setSelectedWarehouseId(e.target.value);
                      setSelectedLocationId('');
                    }}
                    options={warehouses.map((w) => ({
                      value: w.id,
                      label: `${w.name} (${w.code})`,
                    }))}
                  />

                  <Select
                    label="Specific Location (Optional)"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    options={[
                      { value: '', label: 'Default Internal Location' },
                      ...filteredLocations.map((l) => ({
                        value: l.id,
                        label: `${l.name} (${l.code})`,
                      })),
                    ]}
                  />

                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-6 pt-4 border-t border-primary-950/10 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
