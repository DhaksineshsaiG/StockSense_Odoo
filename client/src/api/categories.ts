import apiClient from './client';
import {
  CategoryItem,
  CategoryListResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types';

export interface CategoryListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const categoriesApi = {
  async getCategories(params?: CategoryListParams): Promise<CategoryListResponse> {
    const cleanParams: Record<string, string | number> = {};
    if (params) {
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }

    const response = await apiClient.get<CategoryListResponse>('/categories', {
      params: cleanParams,
    });
    return response.data;
  },

  async getCategoryById(id: string): Promise<CategoryItem> {
    const response = await apiClient.get<{ data: CategoryItem }>(`/categories/${id}`);
    return response.data.data;
  },

  async createCategory(payload: CreateCategoryPayload): Promise<CategoryItem> {
    const response = await apiClient.post<{ message: string; data: CategoryItem }>(
      '/categories',
      payload
    );
    return response.data.data;
  },

  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<CategoryItem> {
    const response = await apiClient.patch<{ message: string; data: CategoryItem }>(
      `/categories/${id}`,
      payload
    );
    return response.data.data;
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/categories/${id}`);
    return response.data;
  },
};
