import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { categoriesApi } from '../../api/categories';
import { CategoryItem } from '../../types';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (category: CategoryItem) => void;
  initialCategory?: CategoryItem | null;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCategory,
}) => {
  const isEdit = Boolean(initialCategory);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategory) {
      setName(initialCategory.name);
      setDescription(initialCategory.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setErrorMessage(null);
  }, [initialCategory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Category name is required.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit && initialCategory) {
        const updated = await categoriesApi.updateCategory(initialCategory.id, {
          name: name.trim(),
          description: description.trim() || null,
        });
        onSuccess(updated);
        onClose();
      } else {
        const created = await categoriesApi.createCategory({
          name: name.trim(),
          description: description.trim() || null,
        });
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save category. Please verify the name is unique.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Category: ${initialCategory?.name}` : 'Add Product Category'}
      subtitle="Organize items into structured catalog classification groups"
      size="md"
    >
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Category Name *"
          placeholder="e.g. Raw Materials, Electronics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div>
          <label className="block text-xs font-semibold text-primary-800/70 uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Brief description of products belonging to this category..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg px-3.5 py-2.5 text-sm glass-input placeholder:text-primary-800/40 focus:outline-none border border-primary-950/10 hover:border-primary-950/20 focus:border-primary-800 text-primary-950"
          />
        </div>

        <div className="mt-6 pt-4 border-t border-primary-950/10 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
