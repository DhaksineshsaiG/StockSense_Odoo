import apiClient from './client';
import { ProductReorderRuleItem, UpdateReorderRulePayload } from '../types';

export const reorderRulesApi = {
  async getRuleById(id: string): Promise<ProductReorderRuleItem> {
    const response = await apiClient.get<{ data: ProductReorderRuleItem }>(`/reorder-rules/${id}`);
    return response.data.data;
  },

  async updateRule(id: string, payload: UpdateReorderRulePayload): Promise<ProductReorderRuleItem> {
    const response = await apiClient.patch<{ message: string; data: ProductReorderRuleItem }>(
      `/reorder-rules/${id}`,
      payload
    );
    return response.data.data;
  },

  async deleteRule(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/reorder-rules/${id}`);
    return response.data;
  },
};
