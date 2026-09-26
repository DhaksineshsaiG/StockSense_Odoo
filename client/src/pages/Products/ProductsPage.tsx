import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Layers,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  FolderTree,
  Building2,
  X,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';
import { productsApi, ProductListParams } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import {
  ProductListItem,
  ProductDetail,
  CategoryItem,
  Warehouse,
  Location,
  ApiPagination,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { TableRowSkeleton } from '../../components/common/LoadingSkeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProductFormModal } from '../../components/products/ProductFormModal';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  // Data states
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState<ApiPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null);

  const [productToDelete, setProductToDelete] = useState<ProductListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch filter dependencies once
  useEffect(() => {
    let isMounted = true;
    async function loadDependencies() {
      try {
        const [catsRes, whsRes, locsRes] = await Promise.all([
          categoriesApi.getCategories({ limit: 100 }),
          warehouseApi.getWarehouses(),
          locationsApi.getLocations({ limit: 100 }),
        ]);

        if (isMounted) {
          setCategories(catsRes.data || []);
          setWarehouses(whsRes || []);
          setLocations(locsRes || []);
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }

    loadDependencies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products with active filters
  const fetchProducts = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const params: ProductListParams = {
          search: searchTerm.trim() || undefined,
          categoryId: selectedCategory || undefined,
          warehouseId: selectedWarehouse || undefined,
          page: currentPage,
          limit: 20,
        };

        const res = await productsApi.getProducts(params);
        setProducts(res.data || []);
        setPagination(res.pagination);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load products from server.';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchTerm, selectedCategory, selectedWarehouse, currentPage]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 on filter changes
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const handleWarehouseChange = (val: string) => {
    setSelectedWarehouse(val);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedWarehouse('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedCategory || selectedWarehouse);

  // Edit Product Handler
  const handleEditClick = async (product: ProductListItem) => {
    try {
      const fullDetail = await productsApi.getProductById(product.id);
      setEditingProduct(fullDetail);
      setIsFormModalOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch product details for editing.');
    }
  };

  // Delete Product Handler
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await productsApi.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Cannot delete product. It may have existing stock or movement records.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Status helper
  const renderStockStatus = (onHand: number, freeToUse: number) => {
    if (onHand <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-800 border border-rose-500/20">
          <AlertOctagon className="w-3 h-3 text-rose-700" /> Out of Stock
        </span>
      );
    }
    if (freeToUse <= 5) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-800 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 text-amber-700" /> Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> In Stock
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-950/10 border border-primary-950/20 flex items-center justify-center text-primary-900">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-primary-950 tracking-tight">Products & Inventory Catalog</h2>
          </div>
          <p className="text-xs text-primary-800/60 mt-1">
            Manage your inventory catalog, pricing parameters, and live multi-location stock levels
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link to="/categories">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FolderTree className="w-3.5 h-3.5 text-primary-900" />}
              className="rounded-xl px-3.5"
            >
              Categories
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setIsFormModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="rounded-xl px-3.5"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-primary-800/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full text-xs glass-input rounded-xl pl-9 pr-3 py-2 text-primary-950 placeholder:text-primary-800/40 border border-primary-950/10 hover:border-primary-950/20 focus:border-primary-800"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full text-xs glass-input rounded-xl px-3 py-2 text-primary-950 border border-primary-950/10 hover:border-primary-950/20 focus:border-primary-800 cursor-pointer"
            >
              <option value="" className="bg-ivory-100 text-primary-950">
                All Categories
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-ivory-100 text-primary-950">
                  {c.name} ({c.productsCount})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse filter */}
          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="w-full text-xs glass-input rounded-xl px-3 py-2 text-primary-950 border border-primary-950/10 hover:border-primary-950/20 focus:border-primary-800 cursor-pointer"
            >
              <option value="" className="bg-ivory-100 text-primary-950">
                All Warehouses
              </option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="bg-ivory-100 text-primary-950">
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Clear & Refresh actions */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                leftIcon={<X className="w-3.5 h-3.5" />}
                className="flex-1 rounded-xl text-xs"
              >
                Clear
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchProducts(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              className="rounded-xl px-3"
            >
              Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Main Products Table */}
      <div className="glass-card p-5">
        {error ? (
          <ErrorState
            title="Failed to load products"
            message={error}
            onRetry={() => fetchProducts(false)}
          />
        ) : isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">Reserved</th>
                  <th className="py-2.5 px-3 text-right">Free to Use</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Sale Price</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <TableRowSkeleton key={idx} columns={9} />
                ))}
              </tbody>
            </table>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6 text-primary-800/40" />}
            title="No products found"
            description={
              hasActiveFilters
                ? 'No catalog items match your search or filter criteria. Try clearing filters.'
                : 'Your inventory catalog is currently empty. Add your first product to get started.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setEditingProduct(null);
                    setIsFormModalOpen(true);
                  }}
                >
                  Add Product
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">Reserved</th>
                  <th className="py-2.5 px-3 text-right">Free to Use</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Sale Price</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {products.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-primary-950/[0.02] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/products/${item.id}`)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-primary-950 group-hover:text-primary-700 transition-colors">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-primary-800/60">{item.sku}</span>
                        {item.barcode && (
                          <span className="text-[10px] text-primary-800/40 font-mono">
                            • {item.barcode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {item.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-950/[0.05] text-primary-900 border border-primary-950/10">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-[11px] text-primary-800/40 italic">Uncategorized</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-primary-950">
                      {item.totalOnHand}{' '}
                      <span className="text-[10px] text-primary-800/60 font-normal">{item.uom}</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-primary-800/60">
                      {item.totalReserved}{' '}
                      <span className="text-[10px] text-primary-800/40 font-normal">{item.uom}</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      {item.freeToUse}{' '}
                      <span className="text-[10px] text-primary-800/60 font-normal">{item.uom}</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-primary-900">
                      ${Number(item.costPrice).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-primary-900">
                      ${Number(item.salePrice).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {renderStockStatus(item.totalOnHand, item.freeToUse)}
                    </td>

                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/products/${item.id}`)}
                          className="p-1.5 rounded-lg text-primary-800/60 hover:text-primary-950 hover:bg-primary-950/5 transition-colors"
                          title="View Product Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 rounded-lg text-primary-800/60 hover:text-primary-900 hover:bg-primary-950/5 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button: MANAGER ONLY */}
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setProductToDelete(item);
                            }}
                            className="p-1.5 rounded-lg text-primary-800/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Delete Product (Manager)"
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

        {/* Pagination Controls */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          fetchProducts();
        }}
        initialData={editingProduct}
        categories={categories}
        warehouses={warehouses}
        locations={locations}
      />

      {/* Delete Product Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete ${productToDelete?.name} (${productToDelete?.sku})? Products with existing stock quants or ledger history cannot be deleted.`
        }
        confirmText="Delete Product"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
