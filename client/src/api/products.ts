import apiClient from './client';
import {
  ProductListResponse,
  ProductDetail,
  CreateProductPayload,
  UpdateProductPayload,
  SetStockPayload,
  ProductReorderRuleItem,
  CreateReorderRulePayload,
} from '../types';

export interface ProductListParams {
  search?: string;
  sku?: string;
  categoryId?: string;
  warehouseId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const productsApi = {
  async getProducts(params?: ProductListParams): Promise<ProductListResponse> {
    const cleanParams: Record<string, string | number> = {};
    if (params) {
      if (params.search) cleanParams.search = params.search;
      if (params.sku) cleanParams.sku = params.sku;
      if (params.categoryId) cleanParams.categoryId = params.categoryId;
      if (params.warehouseId) cleanParams.warehouseId = params.warehouseId;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.order) cleanParams.order = params.order;
    }

    const response = await apiClient.get<ProductListResponse>('/products', {
      params: cleanParams,
    });
    return response.data;
  },

  async getProductById(id: string): Promise<ProductDetail> {
    const response = await apiClient.get<{ data: ProductDetail }>(`/products/${id}`);
    return response.data.data;
  },

  async createProduct(payload: CreateProductPayload): Promise<ProductDetail> {
    const response = await apiClient.post<{ message: string; data: ProductDetail }>(
      '/products',
      payload
    );
    return response.data.data;
  },

  async updateProduct(id: string, payload: UpdateProductPayload): Promise<ProductDetail> {
    const response = await apiClient.patch<{ message: string; data: ProductDetail }>(
      `/products/${id}`,
      payload
    );
    return response.data.data;
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/products/${id}`);
    return response.data;
  },

  async setProductStock(id: string, payload: SetStockPayload): Promise<any> {
    const response = await apiClient.post<{ message: string; data: any }>(
      `/products/${id}/stock`,
      payload
    );
    return response.data.data;
  },

  async getProductReorderRules(id: string): Promise<ProductReorderRuleItem[]> {
    const response = await apiClient.get<{ data: ProductReorderRuleItem[] }>(
      `/products/${id}/reorder-rules`
    );
    return response.data.data;
  },

  async createProductReorderRule(
    id: string,
    payload: CreateReorderRulePayload
  ): Promise<ProductReorderRuleItem> {
    const response = await apiClient.post<{ message: string; data: ProductReorderRuleItem }>(
      `/products/${id}/reorder-rules`,
      payload
    );
    return response.data.data;
  },
};
