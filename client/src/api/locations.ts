import apiClient from './client';
import {
  Location,
  LocationDetail,
  UpdateLocationPayload,
  ApiPagination,
} from '../types';

export interface LocationListParams {
  warehouseId?: string;
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const locationsApi = {
  /**
   * Fetch locations as array (for dropdowns / selection).
   */
  async getLocations(params?: LocationListParams): Promise<Location[]> {
    const cleanParams: Record<string, string | number> = {
      limit: 100,
    };
    if (params) {
      if (params.warehouseId) cleanParams.warehouseId = params.warehouseId;
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.type && params.type !== 'ALL') cleanParams.type = params.type;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }

    const response = await apiClient.get<{ data: Location[] }>('/locations', {
      params: cleanParams,
    });
    return response.data.data;
  },

  /**
   * Fetch locations with server pagination.
   */
  async getLocationsPaged(
    params?: LocationListParams
  ): Promise<{ data: Location[]; pagination: ApiPagination }> {
    const cleanParams: Record<string, string | number> = {};
    if (params) {
      if (params.warehouseId && params.warehouseId !== 'ALL') cleanParams.warehouseId = params.warehouseId;
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.type && params.type !== 'ALL') cleanParams.type = params.type;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }

    const response = await apiClient.get<{ data: Location[]; pagination: ApiPagination }>(
      '/locations',
      { params: cleanParams }
    );
    return response.data;
  },

  /**
   * Fetch full location detail including warehouse info, stored product quants, and reorder rules.
   */
  async getLocationById(id: string): Promise<LocationDetail> {
    const response = await apiClient.get<{ data: LocationDetail }>(`/locations/${id}`);
    return response.data.data;
  },

  /**
   * Update mutable fields of an existing location.
   */
  async updateLocation(id: string, payload: UpdateLocationPayload): Promise<Location> {
    const response = await apiClient.patch<{ message: string; data: Location }>(
      `/locations/${id}`,
      payload
    );
    return response.data.data;
  },

  /**
   * Delete location (Manager only, succeeds only if zero active stock, rules, and operations).
   */
  async deleteLocation(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(`/locations/${id}`);
    return response.data;
  },
};

export default locationsApi;
