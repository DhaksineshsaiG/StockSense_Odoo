import apiClient from './client';
import { DashboardData } from '../types';

export interface DashboardFilterParams {
  warehouseId?: string;
  categoryId?: string;
  type?: string;
  status?: string;
}

export const dashboardApi = {
  async getDashboard(params?: DashboardFilterParams): Promise<DashboardData> {
    const cleanParams: Record<string, string> = {};
    if (params) {
      if (params.warehouseId) cleanParams.warehouseId = params.warehouseId;
      if (params.categoryId) cleanParams.categoryId = params.categoryId;
      if (params.type) cleanParams.type = params.type;
      if (params.status) cleanParams.status = params.status;
    }

    const response = await apiClient.get<{ message?: string; data?: DashboardData } & DashboardData>(
      '/dashboard',
      { params: cleanParams }
    );

    // The backend returns both { data: {...}, ...data }
    return response.data.data || response.data;
  },
};
