import React, { useState, useEffect } from 'react';
import { MapPin, Hash, Layers } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Location, CreateLocationPayload, UpdateLocationPayload } from '../../types';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (location: Location) => void;
  warehouseId: string;
  warehouseCode?: string;
  locationToEdit?: Location | null;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  warehouseId,
  warehouseCode = 'WH',
  locationToEdit,
}) => {
  const isEdit = Boolean(locationToEdit);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('INTERNAL');

  const [errors, setErrors] = useState<{ name?: string; code?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (locationToEdit) {
      setName(locationToEdit.name || '');
      setCode(locationToEdit.code || '');
      setType(locationToEdit.type || 'INTERNAL');
    } else {
      setName('');
      setCode('');
      setType('INTERNAL');
    }
    setErrors({});
  }, [locationToEdit, isOpen]);

  const validate = () => {
    const newErrors: { name?: string; code?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Location name is required';
    }

    if (isEdit && !code.trim()) {
      newErrors.code = 'Location code cannot be empty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEdit && locationToEdit) {
        const payload: UpdateLocationPayload = {
          name: name.trim(),
          code: code.trim(),
          type,
        };
        const updated = await locationsApi.updateLocation(locationToEdit.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreateLocationPayload = {
          name: name.trim(),
          code: code.trim() || undefined,
          type,
        };
        const created = await warehouseApi.createWarehouseLocation(warehouseId, payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save location:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to save location';
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={isEdit ? 'Edit Location' : 'Add Storage Location'}
      subtitle={
        isEdit
          ? `Update storage zone ${locationToEdit?.code}`
          : `Add a location under warehouse ${warehouseCode}`
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700">
            {errors.general}
          </div>
        )}

        <div>
          <Input
            label="Location Name *"
            placeholder="e.g. Stock Shelf A1 or Receiving Dock"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // Auto-suggest code if creating and code is empty
              if (!isEdit && !code) {
                const slug = e.target.value
                  .trim()
                  .replace(/[^a-zA-Z0-9]/g, '-')
                  .replace(/-+/g, '-');
                if (slug) {
                  setCode(`${warehouseCode}/${slug}`);
                }
              }
            }}
            error={errors.name}
            leftIcon={<MapPin className="w-4 h-4" />}
            autoFocus
          />
        </div>

        <div>
          <Input
            label={isEdit ? 'Location Code *' : 'Location Code (Optional)'}
            placeholder={`e.g. ${warehouseCode}/A1-SHELF`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={errors.code}
            helperText={
              isEdit
                ? 'Unique path identifier for routing and operations'
                : 'Leave blank to automatically derive from warehouse and name'
            }
            leftIcon={<Hash className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            label="Location Type *"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'INTERNAL', label: 'Internal Storage (Physical Inventory / Bins)' },
              { value: 'VENDOR', label: 'Vendor / Supplier (External Inbound Source)' },
              { value: 'CUSTOMER', label: 'Customer (External Outbound Destination)' },
              { value: 'INVENTORY_LOSS', label: 'Inventory Loss (Scrap / Shrinkage / Discrepancy)' },
            ]}
          />
        </div>

        <div className="pt-4 border-t border-primary-950/10 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isEdit ? 'Save Changes' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
