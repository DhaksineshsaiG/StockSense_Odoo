import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderTree,
  Plus,
  Search,
  ArrowLeft,
  Edit2,
  Trash2,
  RefreshCw,
  Package,
  Calendar,
} from 'lucide-react';
import { categoriesApi, CategoryListParams } from '../../api/categories';
import { CategoryItem, ApiPagination } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CategoryFormModal } from '../../components/categories/CategoryFormModal';

export const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [pagination, setPagination] = useState<ApiPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const params: CategoryListParams = {
          search: searchTerm.trim() || undefined,
          page: currentPage,
          limit: 20,
        };

        const res = await categoriesApi.getCategories(params);
        setCategories(res.data || []);
        setPagination(res.pagination);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load categories from server.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchTerm, currentPage]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await categoriesApi.deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        `Cannot delete category '${categoryToDelete.name}'. It contains linked products.`;
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="p-1.5 rounded-lg text-primary-950/60 hover:text-primary-950 hover:bg-primary-950/5 transition-colors mr-1"
              title="Back to Products"
            >
              <ArrowLeft className="w-4 h-4 text-primary-800/60 hover:text-primary-950" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900">
              <FolderTree className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-primary-950 tracking-tight">Product Categories</h2>
          </div>
          <p className="text-xs text-primary-800/60 mt-1 pl-11 sm:pl-12">
            Organize products into manageable inventory classification groups
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setIsFormModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="rounded-xl px-3.5"
          >
            Add Category
          </Button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-primary-800/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search categories by name or description..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full text-xs glass-input rounded-xl pl-9 pr-3 py-2 text-primary-950 placeholder:text-primary-800/40 border border-primary-950/10 hover:border-primary-950/20 focus:border-primary-800"
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => fetchCategories(true)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          className="rounded-xl px-3 self-end sm:self-auto"
        >
          Sync
        </Button>
      </div>

      {/* Main Categories Table */}
      <div className="glass-card p-5">
        {error ? (
          <ErrorState
            title="Failed to load categories"
            message={error}
            onRetry={() => fetchCategories(false)}
          />
        ) : isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Products Count</th>
                  <th className="py-2.5 px-3">Created Date</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <TableRowSkeleton key={idx} columns={5} />
                ))}
              </tbody>
            </table>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="w-6 h-6 text-primary-800/40" />}
            title="No categories found"
            description={
              searchTerm
                ? 'No categories match your search term.'
                : 'No product categories defined yet. Add your first category.'
            }
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setEditingCategory(null);
                  setIsFormModalOpen(true);
                }}
              >
                Add Category
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Products Count</th>
                  <th className="py-2.5 px-3">Created Date</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-primary-950/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-primary-950">{cat.name}</span>
                    </td>

                    <td className="py-3 px-3 text-primary-800/70 max-w-xs truncate">
                      {cat.description || <span className="italic text-primary-800/40">—</span>}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-primary-950/10 text-primary-900 border border-primary-950/15">
                        <Package className="w-3 h-3" />
                        {cat.productsCount}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-primary-800/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-primary-800/40" />
                        <span>{new Date(cat.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-primary-800/60 hover:text-primary-900 hover:bg-primary-950/5 transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setCategoryToDelete(cat);
                            }}
                            className="p-1.5 rounded-lg text-primary-800/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Delete Category (Manager)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* Add / Edit Category Modal */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => fetchCategories()}
        initialCategory={editingCategory}
      />

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete category '${categoryToDelete?.name}'? Categories currently linked to existing catalog products cannot be deleted.`
        }
        confirmText="Delete Category"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
