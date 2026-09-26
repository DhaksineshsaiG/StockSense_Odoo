import React, { useState, useEffect } from 'react';
import { Building2, Hash, MapPin } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Warehouse, CreateWarehousePayload, UpdateWarehousePayload } from '../../types';
import { warehouseApi } from '../../api/warehouses';

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (warehouse: Warehouse) => void;
  warehouseToEdit?: Warehouse | null;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  warehouseToEdit,
}) => {
  const isEdit = Boolean(warehouseToEdit);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');

  const [errors, setErrors] = useState<{ name?: string; code?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (warehouseToEdit) {
      setName(warehouseToEdit.name || '');
      setCode(warehouseToEdit.code || '');
      setAddress(warehouseToEdit.address || '');
    } else {
      setName('');
      setCode('');
      setAddress('');
    }
    setErrors({});
  }, [warehouseToEdit, isOpen]);

  const validate = () => {
    const newErrors: { name?: string; code?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }

    if (!code.trim()) {
      newErrors.code = 'Warehouse code is required';
    } else if (code.trim().length > 10) {
      newErrors.code = 'Code must be 10 characters or less';
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
      if (isEdit && warehouseToEdit) {
        const payload: UpdateWarehousePayload = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim() || undefined,
        };
        const updated = await warehouseApi.updateWarehouse(warehouseToEdit.id, payload);
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreateWarehousePayload = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim() || undefined,
        };
        const created = await warehouseApi.createWarehouse(payload);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save warehouse:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to save warehouse';
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={isEdit ? 'Edit Warehouse' : 'Create Warehouse'}
      subtitle={
        isEdit
          ? `Update details for warehouse ${warehouseToEdit?.code}`
          : 'Add a new physical storage or logistics facility'
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
            label="Warehouse Name *"
            placeholder="e.g. Central Distribution Hub"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // Auto-suggest code if creating and code is empty
              if (!isEdit && !code) {
                const auto = e.target.value
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .slice(0, 5)
                  .toUpperCase();
                setCode(auto);
              }
            }}
            error={errors.name}
            leftIcon={<Building2 className="w-4 h-4" />}
            autoFocus
          />
        </div>

        <div>
          <Input
            label="Warehouse Code *"
            placeholder="e.g. WH-MAIN or CDH"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={errors.code}
            helperText="Short unique uppercase identifier for operations and locations"
            leftIcon={<Hash className="w-4 h-4" />}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary-950 uppercase tracking-wider mb-1.5">
            Physical Address (Optional)
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 flex items-center pointer-events-none text-primary-800/40">
              <MapPin className="w-4 h-4" />
            </div>
            <textarea
              rows={2}
              placeholder="e.g. Sector 5, Industrial Area, Hyderabad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs bg-ivory-50 border border-primary-950/15 text-primary-950 placeholder-primary-800/40 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors resize-none"
            />
          </div>
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
            {isEdit ? 'Save Changes' : 'Create Warehouse'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
