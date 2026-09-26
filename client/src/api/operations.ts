import apiClient from './client';
import {
  OperationRecord,
  OperationListResponse,
  DeliveryAvailabilityResponse,
  CreateReceiptPayload,
  UpdateReceiptPayload,
  CreateDeliveryPayload,
  UpdateDeliveryPayload,
  CreateTransferPayload,
  UpdateTransferPayload,
  CreateAdjustmentPayload,
  UpdateAdjustmentPayload,
} from '../types';

export interface OperationListParams {
  status?: string;
  warehouseId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ReceiptsListResult {
  total: number;
  limit: number;
  offset: number;
  receipts: OperationRecord[];
}

export interface DeliveriesListResult {
  total: number;
  limit: number;
  offset: number;
  deliveries: OperationRecord[];
}

export interface TransfersListResult {
  total: number;
  limit: number;
  offset: number;
  transfers: OperationRecord[];
}

export interface AdjustmentsListResult {
  total: number;
  limit: number;
  offset: number;
  adjustments: OperationRecord[];
}

function cleanParams(params?: OperationListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (!params) return query;
  if (params.status) query.status = params.status;
  if (params.warehouseId) query.warehouseId = params.warehouseId;
  if (params.search && params.search.trim()) query.search = params.search.trim();
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;
  return query;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPTS API
// ─────────────────────────────────────────────────────────────────────────────
export const receiptsApi = {
  async getReceipts(params?: OperationListParams): Promise<ReceiptsListResult> {
    const res = await apiClient.get<OperationListResponse>('/operations/receipts', {
      params: cleanParams(params),
    });
    return {
      total: res.data.total ?? 0,
      limit: res.data.limit ?? 20,
      offset: res.data.offset ?? 0,
      receipts: res.data.receipts || [],
    };
  },

  async getReceiptById(id: string): Promise<OperationRecord> {
    const res = await apiClient.get<{ message?: string; data: OperationRecord }>(
      `/operations/receipts/${id}`
    );
    return res.data.data;
  },

  async createReceipt(payload: CreateReceiptPayload): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      '/operations/receipts',
      payload
    );
    return res.data.data;
  },

  async updateReceipt(id: string, payload: UpdateReceiptPayload): Promise<OperationRecord> {
    const res = await apiClient.patch<{ message?: string; data: OperationRecord }>(
      `/operations/receipts/${id}`,
      payload
    );
    return res.data.data;
  },

  async validateReceipt(id: string): Promise<OperationRecord> {
    const current = await this.getReceiptById(id);
    if (current.status === 'DRAFT') {
      await this.updateReceipt(id, { status: 'READY' });
    }
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/receipts/${id}/validate`
    );
    return res.data.data;
  },

  async cancelReceipt(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/receipts/${id}/cancel`
    );
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERIES API
// ─────────────────────────────────────────────────────────────────────────────
export const deliveriesApi = {
  async getDeliveries(params?: OperationListParams): Promise<DeliveriesListResult> {
    const res = await apiClient.get<OperationListResponse>('/operations/deliveries', {
      params: cleanParams(params),
    });
    return {
      total: res.data.total ?? 0,
      limit: res.data.limit ?? 20,
      offset: res.data.offset ?? 0,
      deliveries: res.data.deliveries || [],
    };
  },

  async getDeliveryById(id: string): Promise<OperationRecord> {
    const res = await apiClient.get<{ message?: string; data: OperationRecord }>(
      `/operations/deliveries/${id}`
    );
    return res.data.data;
  },

  async createDelivery(payload: CreateDeliveryPayload): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      '/operations/deliveries',
      payload
    );
    return res.data.data;
  },

  async updateDelivery(id: string, payload: UpdateDeliveryPayload): Promise<OperationRecord> {
    const res = await apiClient.patch<{ message?: string; data: OperationRecord }>(
      `/operations/deliveries/${id}`,
      payload
    );
    return res.data.data;
  },

  async checkDeliveryAvailability(id: string): Promise<DeliveryAvailabilityResponse> {
    const res = await apiClient.post<DeliveryAvailabilityResponse>(
      `/operations/deliveries/${id}/check-availability`
    );
    return res.data;
  },

  async validateDelivery(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/deliveries/${id}/validate`
    );
    return res.data.data;
  },

  async cancelDelivery(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/deliveries/${id}/cancel`
    );
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TRANSFERS API
// ─────────────────────────────────────────────────────────────────────────────
export const transfersApi = {
  async getTransfers(params?: OperationListParams): Promise<TransfersListResult> {
    const res = await apiClient.get<OperationListResponse>('/operations/transfers', {
      params: cleanParams(params),
    });
    return {
      total: res.data.total ?? 0,
      limit: res.data.limit ?? 20,
      offset: res.data.offset ?? 0,
      transfers: res.data.transfers || [],
    };
  },

  async getTransferById(id: string): Promise<OperationRecord> {
    const res = await apiClient.get<{ message?: string; data: OperationRecord }>(
      `/operations/transfers/${id}`
    );
    return res.data.data;
  },

  async createTransfer(payload: CreateTransferPayload): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      '/operations/transfers',
      payload
    );
    return res.data.data;
  },

  async updateTransfer(id: string, payload: UpdateTransferPayload): Promise<OperationRecord> {
    const res = await apiClient.patch<{ message?: string; data: OperationRecord }>(
      `/operations/transfers/${id}`,
      payload
    );
    return res.data.data;
  },

  async validateTransfer(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/transfers/${id}/validate`
    );
    return res.data.data;
  },

  async cancelTransfer(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/transfers/${id}/cancel`
    );
    return res.data.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY ADJUSTMENTS API
// ─────────────────────────────────────────────────────────────────────────────
export const adjustmentsApi = {
  async getAdjustments(params?: OperationListParams): Promise<AdjustmentsListResult> {
    const res = await apiClient.get<OperationListResponse>('/operations/adjustments', {
      params: cleanParams(params),
    });
    return {
      total: res.data.total ?? 0,
      limit: res.data.limit ?? 20,
      offset: res.data.offset ?? 0,
      adjustments: res.data.adjustments || [],
    };
  },

  async getAdjustmentById(id: string): Promise<OperationRecord> {
    const res = await apiClient.get<{ message?: string; data: OperationRecord }>(
      `/operations/adjustments/${id}`
    );
    return res.data.data;
  },

  async createAdjustment(payload: CreateAdjustmentPayload): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      '/operations/adjustments',
      payload
    );
    return res.data.data;
  },

  async updateAdjustment(id: string, payload: UpdateAdjustmentPayload): Promise<OperationRecord> {
    const res = await apiClient.patch<{ message?: string; data: OperationRecord }>(
      `/operations/adjustments/${id}`,
      payload
    );
    return res.data.data;
  },

  async validateAdjustment(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/adjustments/${id}/validate`
    );
    return res.data.data;
  },

  async cancelAdjustment(id: string): Promise<OperationRecord> {
    const res = await apiClient.post<{ message?: string; data: OperationRecord }>(
      `/operations/adjustments/${id}/cancel`
    );
    return res.data.data;
  },
};

// Unified export
export const operationsApi = {
  receipts: receiptsApi,
  deliveries: deliveriesApi,
  transfers: transfersApi,
  adjustments: adjustmentsApi,
};

export default operationsApi;
