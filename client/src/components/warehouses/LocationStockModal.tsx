import React, { useState, useEffect } from 'react';
import { Package, MapPin, Hash, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { LocationDetail } from '../../types';
import { locationsApi } from '../../api/locations';

interface LocationStockModalProps {
  locationId: string | null;
  onClose: () => void;
}

export const LocationStockModal: React.FC<LocationStockModalProps> = ({
  locationId,
  onClose,
}) => {
  const [detail, setDetail] = useState<LocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await locationsApi.getLocationById(locationId);
        if (isMounted) setDetail(data);
      } catch (err: any) {
        console.error('Failed to fetch location detail:', err);
        if (isMounted) {
          setError(err?.response?.data?.message || 'Unable to retrieve location stock.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [locationId]);

  const isOpen = Boolean(locationId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={detail ? `${detail.name} — Stock Breakdown` : 'Location Stock Quants'}
      subtitle={detail ? `Location Code: ${detail.code} (${detail.warehouse?.name})` : undefined}
      size="lg"
    >
      {isLoading ? (
        <div className="py-6">
          <LoadingSkeleton lines={6} />
        </div>
      ) : error ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-xs text-rose-300">{error}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : detail ? (
        <div className="space-y-5">
          {/* Top Stock Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-ivory-100 border border-primary-950/10 text-center shadow-sm">
              <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Total On-Hand
              </span>
              <div className="text-lg font-mono font-bold text-primary-950 mt-0.5">
                {detail.stockSummary?.totalOnHand ?? 0}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-ivory-100 border border-primary-950/10 text-center shadow-sm">
              <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Reserved
              </span>
              <div className="text-lg font-mono font-bold text-amber-800 mt-0.5">
                {detail.stockSummary?.totalReserved ?? 0}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-ivory-100 border border-primary-950/10 text-center shadow-sm">
              <span className="text-[10px] uppercase font-bold text-primary-800/60 tracking-wider">
                Free to Use
              </span>
              <div className="text-lg font-mono font-bold text-emerald-700 mt-0.5">
                {detail.stockSummary?.freeToUse ?? 0}
              </div>
            </div>
          </div>

          {/* Product Breakdown Table */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-primary-950/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-950 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary-900" />
                <span>Products Stored in this Location ({detail.products?.length || 0})</span>
              </h4>
            </div>

            {!detail.products || detail.products.length === 0 ? (
              <EmptyState
                icon={<Package className="w-6 h-6 text-primary-800/40" />}
                title="No stock quants found"
                description="This location currently has no inventory quants on hand."
                className="py-8"
              />
            ) : (
              <div className="overflow-x-auto border border-primary-950/10 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-primary-950/10 text-[11px] font-semibold text-primary-800/60 uppercase tracking-wider bg-primary-950/[0.02]">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">On Hand</th>
                      <th className="py-2.5 px-3 text-right">Reserved</th>
                      <th className="py-2.5 px-3 text-right">Free to Use</th>
                      <th className="py-2.5 px-3 text-center">UoM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-950/5 text-primary-900">
                    {detail.products.map((item) => (
                      <tr key={item.productId} className="hover:bg-primary-950/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-primary-950">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-primary-800/70">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-primary-950">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                          {item.reservedQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {item.freeToUse}
                        </td>
                        <td className="py-2.5 px-3 text-center text-primary-800/60 text-[11px]">
                          {item.uom || 'Units'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-primary-950/10 flex justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
