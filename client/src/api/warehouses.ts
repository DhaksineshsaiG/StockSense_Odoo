import apiClient from './client';
import {
  Warehouse,
  WarehouseDetail,
  WarehouseListResponse,
  CreateWarehousePayload,
  UpdateWarehousePayload,
  CreateLocationPayload,
  Location,
  ApiPagination,
} from '../types';

export interface WarehouseFilterParams {
  search?: string;
  code?: string;
  page?: number;
  limit?: number;
}

export const warehouseApi = {
  /**
   * Fetch all warehouses as an array (ideal for dropdowns / lookups).
   */
  async getWarehouses(params?: WarehouseFilterParams): Promise<Warehouse[]> {
    const response = await apiClient.get<WarehouseListResponse>('/warehouses', {
      params: {
        limit: 100,
        ...params,
      },
    });
    return response.data.data;
  },

  /**
   * Fetch warehouses with pagination data.
   */
  async getWarehousesPaged(params?: WarehouseFilterParams): Promise<WarehouseListResponse> {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.code?.trim()) cleanParams.code = params.code.trim();
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }

    const response = await apiClient.get<WarehouseListResponse>('/warehouses', {
      params: cleanParams,
    });
    return response.data;
  },

  /**
   * Get complete warehouse detail including its locations and stock summary.
   */
  async getWarehouseById(id: string): Promise<WarehouseDetail> {
    const response = await apiClient.get<{ data: WarehouseDetail }>(`/warehouses/${id}`);
    return response.data.data;
  },

  /**
   * Create a new warehouse.
   */
  async createWarehouse(payload: CreateWarehousePayload): Promise<Warehouse> {
    const response = await apiClient.post<{ message: string; data: Warehouse }>(
      '/warehouses',
      payload
    );
    return response.data.data;
  },

  /**
   * Update an existing warehouse.
   */
  async updateWarehouse(id: string, payload: UpdateWarehousePayload): Promise<Warehouse> {
    const response = await apiClient.patch<{ message: string; data: Warehouse }>(
      `/warehouses/${id}`,
      payload
    );
    return response.data.data;
  },

  /**
   * Delete warehouse (Manager only, succeeds only if 0 locations and 0 operations).
   */
  async deleteWarehouse(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(`/warehouses/${id}`);
    return response.data;
  },

  /**
   * List locations belonging to a specific warehouse.
   */
  async listWarehouseLocations(
    warehouseId: string,
    params?: { search?: string; type?: string; page?: number; limit?: number }
  ): Promise<{ data: Location[]; pagination: ApiPagination }> {
    const response = await apiClient.get<{ data: Location[]; pagination: ApiPagination }>(
      `/warehouses/${warehouseId}/locations`,
      { params }
    );
    return response.data;
  },

  /**
   * Create a location under a specific warehouse.
   */
  async createWarehouseLocation(
    warehouseId: string,
    payload: CreateLocationPayload
  ): Promise<Location> {
    const response = await apiClient.post<{ message: string; data: Location }>(
      `/warehouses/${warehouseId}/locations`,
      payload
    );
    return response.data.data;
  },
};

export default warehouseApi;
