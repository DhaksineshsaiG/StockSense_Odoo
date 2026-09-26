import apiClient from './client';
import {
  MoveHistoryFilters,
  MoveHistoryResponse,
  MoveDetailResponse,
  StockMoveRecord,
} from '../types';

export const ledgerApi = {
  /**
   * Fetch paginated list of stock moves / ledger entries with optional filters.
   * Uses GET /api/ledger
   */
  getMoveHistory: async (filters: MoveHistoryFilters = {}): Promise<MoveHistoryResponse> => {
    const params: Record<string, any> = {};

    if (filters.type && filters.type !== 'ALL') params.type = filters.type;
    if (filters.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters.warehouseId && filters.warehouseId !== 'ALL') params.warehouseId = filters.warehouseId;
    if (filters.categoryId && filters.categoryId !== 'ALL') params.categoryId = filters.categoryId;
    if (filters.productId && filters.productId !== 'ALL') params.productId = filters.productId;
    if (filters.locationId && filters.locationId !== 'ALL') params.locationId = filters.locationId;
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const limit = filters.limit || 20;
    params.limit = limit;

    if (filters.offset !== undefined) {
      params.offset = filters.offset;
    } else if (filters.page !== undefined) {
      params.offset = (filters.page - 1) * limit;
    } else {
      params.offset = 0;
    }

    const response = await apiClient.get<MoveHistoryResponse>('/ledger', { params });
    return response.data;
  },

  /**
   * Fetch single stock move detail by ID.
   * Uses GET /api/ledger/:id
   */
  getMoveById: async (id: string): Promise<StockMoveRecord> => {
    const response = await apiClient.get<MoveDetailResponse>(`/ledger/${id}`);
    return response.data.data;
  },
};

export default ledgerApi;
