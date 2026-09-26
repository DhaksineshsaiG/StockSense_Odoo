import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Edit2,
  Trash2,
  Layers,
  Building2,
  MapPin,
  Sliders,
  Plus,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  DollarSign,
  Barcode,
} from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { warehouseApi } from '../../api/warehouses';
import { locationsApi } from '../../api/locations';
import { reorderRulesApi } from '../../api/reorderRules';
import {
  ProductDetail,
  CategoryItem,
  Warehouse,
  Location,
  ProductReorderRuleItem,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProductFormModal } from '../../components/products/ProductFormModal';
import { SetStockModal } from '../../components/products/SetStockModal';
import { ReorderRuleModal } from '../../components/products/ReorderRuleModal';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSetStockModalOpen, setIsSetStockModalOpen] = useState(false);
  const [isReorderRuleModalOpen, setIsReorderRuleModalOpen] = useState(false);
  const [selectedRuleToEdit, setSelectedRuleToEdit] = useState<ProductReorderRuleItem | null>(null);

  // Delete product state
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteProductError, setDeleteProductError] = useState<string | null>(null);

  // Delete reorder rule state
  const [ruleToDelete, setRuleToDelete] = useState<ProductReorderRuleItem | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  // Fetch product detail
  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await productsApi.getProductById(id);
      setProduct(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        `Product with ID '${id}' not found.`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Fetch auxiliary metadata for modals
  useEffect(() => {
    let isMounted = true;
    async function loadAuxData() {
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
        console.error('Failed to load auxiliary modal metadata:', err);
      }
    }

    loadAuxData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Delete product action
  const handleDeleteProduct = async () => {
    if (!product) return;
    setIsDeletingProduct(true);
    setDeleteProductError(null);

    try {
      await productsApi.deleteProduct(product.id);
      navigate('/products', { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Cannot delete product with existing stock quants or ledger history.';
      setDeleteProductError(msg);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Delete reorder rule action
  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);

    try {
      await reorderRulesApi.deleteRule(ruleToDelete.id);
      setRuleToDelete(null);
      fetchProduct();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete reorder rule.');
    } finally {
      setIsDeletingRule(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-primary-950/10 rounded animate-pulse" />
        <div className="glass-card p-6 h-36 animate-pulse" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-12">
        <ErrorState
          title="Product Unavailable"
          message={error || 'Unable to retrieve product details.'}
          onRetry={fetchProduct}
        />
        <div className="mt-4 text-center">
          <Link to="/products">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { stock, reorderRules } = product;

  return (
    <div className="space-y-6">
      {/* Back button & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs text-primary-800/60 hover:text-primary-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products Catalog
        </Link>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSetStockModalOpen(true)}
            leftIcon={<Layers className="w-3.5 h-3.5 text-primary-900" />}
          >
            Direct Stock Quant
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Edit Product
          </Button>

          {isManager && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setDeleteProductError(null);
                setIsDeleteProductOpen(true);
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Product Header Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-bold text-primary-950 tracking-tight">{product.name}</h2>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-primary-950/10 text-primary-900 border border-primary-950/15 font-bold">
                {product.sku}
              </span>
              {product.category && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-950/[0.05] text-primary-900 border border-primary-950/10">
                  {product.category.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-primary-800/60 mt-2 flex-wrap">
              {product.barcode && (
                <span className="flex items-center gap-1 font-mono">
                  <Barcode className="w-3.5 h-3.5 text-primary-800/40" />
                  {product.barcode}
                </span>
              )}
              <span>
                Unit: <strong className="text-primary-950">{product.uom}</strong>
              </span>
              <span className="flex items-center gap-1 text-primary-800/40">
                <Calendar className="w-3.5 h-3.5" />
                Created {new Date(product.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Quick status pill */}
          <div>
            {stock.totalOnHand <= 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/10 text-rose-800 border border-rose-500/20">
                <AlertOctagon className="w-4 h-4 text-rose-700" /> Out of Stock
              </span>
            ) : stock.totalFreeToUse <= 5 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-800 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-700" /> Low Stock Warning
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> In Stock & Optimal
              </span>
            )}
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="mt-6 pt-6 border-t border-primary-950/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-white/40 border border-primary-950/8">
            <p className="text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider">Total On Hand</p>
            <p className="text-xl font-black text-primary-950 font-mono mt-1">
              {stock.totalOnHand} <span className="text-xs text-primary-800/60 font-normal">{product.uom}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/40 border border-primary-950/8">
            <p className="text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider">Reserved</p>
            <p className="text-xl font-black text-primary-800/70 font-mono mt-1">
              {stock.totalReserved} <span className="text-xs text-primary-800/60 font-normal">{product.uom}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/40 border border-primary-950/8">
            <p className="text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider">Free to Use</p>
            <p className="text-xl font-black text-emerald-700 font-mono mt-1">
              {stock.totalFreeToUse} <span className="text-xs text-primary-800/60 font-normal">{product.uom}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/40 border border-primary-950/8">
            <p className="text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider">Cost Price</p>
            <p className="text-xl font-black text-primary-950 font-mono mt-1">
              ${Number(product.costPrice).toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/40 border border-primary-950/8 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider">Sale Price</p>
            <p className="text-xl font-black text-primary-950 font-mono mt-1">
              ${Number(product.salePrice).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Breakdown: Warehouses & Storage Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Warehouse */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
            <h3 className="text-sm font-bold text-primary-950 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-900" />
              <span>Stock by Physical Warehouse</span>
            </h3>
            <span className="text-xs text-primary-800/60 font-mono">{stock.byWarehouse.length} facilities</span>
          </div>

          <div className="mt-3 overflow-x-auto">
            {stock.byWarehouse.length === 0 ? (
              <EmptyState
                icon={<Building2 className="w-5 h-5 text-primary-800/40" />}
                title="No warehouse stock registered"
                description="Use Direct Stock Quant or create an incoming receipt to allocate stock."
                className="py-8"
              />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary-950/10 text-[10px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                    <th className="py-2 px-3">Warehouse</th>
                    <th className="py-2 px-3 text-right">On Hand</th>
                    <th className="py-2 px-3 text-right">Reserved</th>
                    <th className="py-2 px-3 text-right">Free to Use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                  {stock.byWarehouse.map((wh) => (
                    <tr key={wh.warehouseId} className="hover:bg-primary-950/[0.02]">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-primary-950">{wh.warehouseName}</span>{' '}
                        <span className="text-[11px] text-primary-800/60 font-mono">({wh.warehouseCode})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary-950">
                        {wh.onHand}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary-800/60">
                        {wh.reserved}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {wh.freeToUse}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stock by Location */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-primary-950/10">
            <h3 className="text-sm font-bold text-primary-950 tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-900" />
              <span>Stock by Storage Location</span>
            </h3>
            <span className="text-xs text-primary-800/60 font-mono">{stock.byLocation.length} bins</span>
          </div>

          <div className="mt-3 overflow-x-auto">
            {stock.byLocation.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-5 h-5 text-primary-800/40" />}
                title="No location balances"
                description="Physical stock quants have not been recorded in any location yet."
                className="py-8"
              />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary-950/10 text-[10px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                    <th className="py-2 px-3">Location / Code</th>
                    <th className="py-2 px-3">Warehouse</th>
                    <th className="py-2 px-3 text-right">On Hand</th>
                    <th className="py-2 px-3 text-right">Free</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                  {stock.byLocation.map((loc) => (
                    <tr key={loc.locationId} className="hover:bg-primary-950/[0.02]">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-primary-950">{loc.locationName}</span>
                        <div className="text-[10px] text-primary-800/60 font-mono mt-0.5">
                          {loc.locationCode} • <span className="uppercase text-primary-800/50">{loc.locationType}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-primary-900">
                        {loc.warehouseCode}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary-950">
                        {loc.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {loc.freeToUse}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Reorder Rules Section */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary-950/10">
          <div>
            <h3 className="text-base font-bold text-primary-950 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary-900" />
              <span>Automated Reorder Rules</span>
            </h3>
            <p className="text-xs text-primary-800/60 mt-0.5">
              Configured threshold parameters triggering automatic low-stock notifications
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedRuleToEdit(null);
              setIsReorderRuleModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="self-start sm:self-auto rounded-xl px-3"
          >
            Add Reorder Rule
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {reorderRules.length === 0 ? (
            <EmptyState
              icon={<Sliders className="w-5 h-5 text-primary-800/40" />}
              title="No automated reorder rules defined"
              description="Define minimum and maximum replenishment thresholds to automate low-stock warnings."
              className="py-10"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedRuleToEdit(null);
                    setIsReorderRuleModalOpen(true);
                  }}
                >
                  Create Rule
                </Button>
              }
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                  <th className="py-2.5 px-3">Storage Location</th>
                  <th className="py-2.5 px-3">Warehouse</th>
                  <th className="py-2.5 px-3 text-right">Min Quantity</th>
                  <th className="py-2.5 px-3 text-right">Max Quantity</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-950/5 text-xs text-primary-900">
                {reorderRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-primary-950/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-primary-950">{rule.locationName}</span>
                      <div className="text-[10px] text-primary-800/60 font-mono mt-0.5">{rule.locationCode}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-primary-900 font-medium">
                        {rule.warehouseName} ({rule.warehouseCode})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-amber-800">
                      {rule.minQuantity} <span className="text-[10px] text-primary-800/60">{product.uom}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      {rule.maxQuantity} <span className="text-[10px] text-primary-800/60">{product.uom}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRuleToEdit(rule);
                            setIsReorderRuleModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-primary-800/60 hover:text-primary-900 hover:bg-primary-950/5 transition-colors"
                          title="Edit Reorder Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isManager && (
                          <button
                            type="button"
                            onClick={() => setRuleToDelete(rule)}
                            className="p-1.5 rounded-lg text-primary-800/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Delete Reorder Rule (Manager)"
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
          )}
        </div>
      </div>

      {/* Edit Product Modal */}
      <ProductFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => fetchProduct()}
        initialData={product}
        categories={categories}
        warehouses={warehouses}
        locations={locations}
      />

      {/* Direct Set Stock Modal */}
      <SetStockModal
        isOpen={isSetStockModalOpen}
        onClose={() => setIsSetStockModalOpen(false)}
        onSuccess={() => fetchProduct()}
        product={product}
        warehouses={warehouses}
        locations={locations}
      />

      {/* Reorder Rule Modal (Add / Edit) */}
      <ReorderRuleModal
        isOpen={isReorderRuleModalOpen}
        onClose={() => setIsReorderRuleModalOpen(false)}
        onSuccess={() => fetchProduct()}
        productId={product.id}
        initialRule={selectedRuleToEdit}
        locations={locations}
        warehouses={warehouses}
      />

      {/* Delete Product Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteProductOpen}
        onClose={() => setIsDeleteProductOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={
          deleteProductError
            ? deleteProductError
            : `Are you sure you want to delete ${product.name} (${product.sku})? Products with existing stock quants or ledger history cannot be deleted.`
        }
        confirmText="Delete Product"
        variant="danger"
        isLoading={isDeletingProduct}
      />

      {/* Delete Reorder Rule Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(ruleToDelete)}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleDeleteRule}
        title="Delete Reorder Rule"
        message={`Delete automated reorder rule for location ${ruleToDelete?.locationName} (${ruleToDelete?.locationCode})?`}
        confirmText="Delete Rule"
        variant="danger"
        isLoading={isDeletingRule}
      />
    </div>
  );
};
