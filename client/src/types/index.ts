export type UserRole = 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  locationsCount?: number;
  operationsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  stockSummary?: {
    totalOnHand: number;
    totalReserved: number;
    freeToUse: number;
  };
}

export interface WarehouseLocationItem {
  id: string;
  name: string;
  code: string;
  type: 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'INVENTORY_LOSS' | string;
  warehouseId?: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt?: string;
  onHand: number;
  reservedQuantity: number;
  freeToUse: number;
}

export interface WarehouseDetail {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  operationsCount: number;
  stockSummary: {
    totalOnHand: number;
    totalReserved: number;
    freeToUse: number;
  };
  locations: WarehouseLocationItem[];
}

export interface CreateWarehousePayload {
  name: string;
  code: string;
  address?: string;
}

export interface UpdateWarehousePayload {
  name?: string;
  code?: string;
  address?: string;
}

export interface LocationProductStock {
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  reservedQuantity: number;
  freeToUse: number;
  updatedAt?: string;
}

export interface LocationDetail {
  id: string;
  name: string;
  code: string;
  type: 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'INVENTORY_LOSS' | string;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
  };
  createdAt: string;
  stockSummary: {
    totalOnHand: number;
    totalReserved: number;
    freeToUse: number;
  };
  products: LocationProductStock[];
  reorderRules: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    minQuantity: number;
    maxQuantity: number;
    createdAt: string;
  }>;
}

export interface CreateLocationPayload {
  name: string;
  code?: string;
  type?: 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'INVENTORY_LOSS' | string;
}

export interface UpdateLocationPayload {
  name?: string;
  code?: string;
  type?: 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'INVENTORY_LOSS' | string;
  warehouseId?: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'INVENTORY_LOSS' | string;
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt?: string;
  onHand?: number;
  reservedQuantity?: number;
  freeToUse?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    products: number;
  };
}

export interface CategoryItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  productsCount: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  category?: string | null;
  uom: string;
  costPrice: number;
  salePrice: number;
  createdAt: string;
  updatedAt: string;
  totalOnHand: number;
  totalReserved: number;
  freeToUse: number;
}

export interface ProductStockByLocation {
  locationId: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  freeToUse: number;
}

export interface ProductStockByWarehouse {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  freeToUse: number;
}

export interface ProductReorderRuleItem {
  id: string;
  productId?: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  minQuantity: number;
  maxQuantity: number;
  createdAt: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  category?: ProductCategory | null;
  uom: string;
  costPrice: number;
  salePrice: number;
  createdAt: string;
  updatedAt: string;
  stock: {
    totalOnHand: number;
    totalReserved: number;
    totalFreeToUse: number;
    byLocation: ProductStockByLocation[];
    byWarehouse: ProductStockByWarehouse[];
  };
  reorderRules: ProductReorderRuleItem[];
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  uom?: string;
  costPrice?: number;
  salePrice?: number;
  initialStock?: Array<{
    locationId?: string;
    warehouseId?: string;
    quantity: number;
  }>;
  locationId?: string;
  initialStockQuantity?: number;
}

export interface UpdateProductPayload {
  name?: string;
  sku?: string;
  barcode?: string | null;
  categoryId?: string | null;
  uom?: string;
  costPrice?: number;
  salePrice?: number;
}

export interface SetStockPayload {
  locationId?: string;
  warehouseId?: string;
  quantity: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string | null;
}

export interface CreateReorderRulePayload {
  locationId: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface UpdateReorderRulePayload {
  minQuantity?: number;
  maxQuantity?: number;
}

export interface DashboardKpis {
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  internalTransfers: number;
}

export interface LowStockItem {
  product: {
    id: string;
    name: string;
    sku: string;
    uom: string;
  };
  category?: {
    id: string;
    name: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
  };
  onHand: number;
  reservedQuantity: number;
  freeToUse: number;
  reorderThreshold: number;
  maxQuantity?: number;
}

export interface OutOfStockItem {
  product: {
    id: string;
    name: string;
    sku: string;
    uom: string;
  };
  category?: {
    id: string;
    name: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
  };
  onHand: number;
  reservedQuantity: number;
  freeToUse: number;
  reorderThreshold: number | null;
}

export interface DashboardOperationSummary {
  id: string;
  reference: string;
  type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  partnerName?: string | null;
  scheduledDate?: string | null;
  createdAt: string;
  responsible?: {
    id: string;
    name: string;
    email: string;
  } | null;
  itemCount: number;
  totalDemandQty: number;
}

export interface WarehouseSummary {
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockMove {
  id: string;
  reference: string;
  operationType: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
  state: 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'DONE' | 'CANCELED';
  product: {
    id: string;
    sku: string;
    name: string;
    uom?: string;
  };
  fromLocation?: {
    id: string;
    name: string;
    code: string;
    type?: string;
  } | null;
  toLocation?: {
    id: string;
    name: string;
    code: string;
    type?: string;
  } | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  quantity: number;
  date: string;
  operation?: {
    id: string;
    reference: string;
    type: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface DashboardData {
  filters: {
    warehouseId: string | null;
    categoryId: string | null;
    type: string | null;
    status: string | null;
  };
  kpis: DashboardKpis;
  lowStock: {
    count: number;
    items: LowStockItem[];
  };
  outOfStock: {
    count: number;
    items: OutOfStockItem[];
  };
  pendingReceipts: {
    count: number;
    items: DashboardOperationSummary[];
  };
  pendingDeliveries: {
    count: number;
    items: DashboardOperationSummary[];
  };
  internalTransfers: {
    count: number;
    pendingCount: number;
    totalCount: number;
    items: DashboardOperationSummary[];
  };
  warehouseSummary: WarehouseSummary[];
  recentActivity: StockMove[];
}

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WarehouseListResponse {
  data: Warehouse[];
  pagination: ApiPagination;
}

export interface ProductListResponse {
  data: ProductListItem[];
  pagination: ApiPagination;
}

export interface CategoryListResponse {
  data: CategoryItem[];
  pagination: ApiPagination;
}

export type OperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
export type OperationStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';

export interface OperationItemDetail {
  id: string;
  operationId?: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    uom?: string;
    costPrice?: number;
    salePrice?: number;
  };
  demandQty: number;
  doneQty: number;
  uom?: string | null;
  physicalQuantity?: number;
  recordedQuantity?: number;
  difference?: number;
  createdAt?: string;
}

export interface OperationRecord {
  id: string;
  reference: string;
  type: OperationType;
  status: OperationStatus;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  sourceLocationId?: string | null;
  sourceLocation?: {
    id: string;
    name: string;
    code: string;
    type?: string;
  } | null;
  destLocationId?: string | null;
  destLocation?: {
    id: string;
    name: string;
    code: string;
    type?: string;
  } | null;
  partnerName?: string | null;
  scheduledDate?: string | null;
  notes?: string | null;
  responsibleId?: string | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  items: OperationItemDetail[];
  _count?: {
    items: number;
  };
  stockMoves?: StockMove[];
}

export interface OperationListResponse {
  message?: string;
  total: number;
  limit: number;
  offset: number;
  receipts?: OperationRecord[];
  deliveries?: OperationRecord[];
  transfers?: OperationRecord[];
  adjustments?: OperationRecord[];
}

export interface DeliveryAvailabilityLine {
  productId: string;
  productName: string;
  sku: string;
  demandQty: number;
  availableQty: number;
  reservedQty: number;
  isAvailable: boolean;
  shortage: number;
}

export interface DeliveryAvailabilityResponse {
  message: string;
  status: 'READY' | 'WAITING';
  isFullyAvailable: boolean;
  lines: DeliveryAvailabilityLine[];
  delivery: OperationRecord;
}

export interface CreateReceiptPayload {
  warehouseId: string;
  destLocationId: string;
  partnerName?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: Array<{
    productId: string;
    demandQty: number;
    uom?: string;
  }>;
}

export interface UpdateReceiptPayload {
  destLocationId?: string;
  partnerName?: string;
  scheduledDate?: string | Date;
  notes?: string;
  status?: string;
  responsibleId?: string;
  items?: Array<{
    productId: string;
    demandQty: number;
    uom?: string;
  }>;
}

export interface CreateDeliveryPayload {
  warehouseId: string;
  sourceLocationId: string;
  partnerName?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: Array<{
    productId: string;
    demandQty: number;
    uom?: string;
  }>;
}

export interface UpdateDeliveryPayload {
  sourceLocationId?: string;
  partnerName?: string;
  scheduledDate?: string | Date;
  notes?: string;
  status?: string;
  responsibleId?: string;
  items?: Array<{
    productId: string;
    demandQty: number;
    uom?: string;
  }>;
}

export interface CreateTransferPayload {
  warehouseId: string;
  sourceLocationId: string;
  destLocationId: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: Array<{
    productId: string;
    demandQty: number;
    uom?: string;
  }>;
}

export interface UpdateTransferPayload {
  sourceLocationId?: string;
  destLocationId?: string;
  scheduledDate?: string | Date;
  notes?: string;
  status?: string;
  responsibleId?: string;
  items?: Array<{
    productId: string;
    demandQty: number;
    uom?: string;
  }>;
}

export interface CreateAdjustmentPayload {
  warehouseId: string;
  locationId: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: Array<{
    productId: string;
    physicalQuantity: number;
    recordedQuantity?: number;
    uom?: string;
  }>;
}

export interface UpdateAdjustmentPayload {
  locationId?: string;
  scheduledDate?: string | Date;
  notes?: string;
  status?: string;
  responsibleId?: string;
  items?: Array<{
    productId: string;
    physicalQuantity: number;
    recordedQuantity?: number;
    uom?: string;
  }>;
}

// ─── Stock Ledger / Move History Types ─────────────────────────────────────
export type MoveDirection = 'INCOMING' | 'OUTGOING' | 'INTERNAL' | 'UNKNOWN';

export interface StockMoveRecord {
  id: string;
  reference: string;
  date: string;
  timestamp: string;
  type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT' | string;
  direction: MoveDirection;
  status: string;
  quantity: number;
  uom: string;
  product: {
    id: string;
    name: string;
    sku: string;
    uom?: string;
    costPrice?: number;
    salePrice?: number;
  };
  category?: {
    id: string;
    name: string;
  } | null;
  fromLocation?: {
    id: string;
    name: string;
    code: string;
    type?: string;
    warehouseId?: string;
  } | null;
  toLocation?: {
    id: string;
    name: string;
    code: string;
    type?: string;
    warehouseId?: string;
  } | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  operationId?: string | null;
  operation?: {
    id: string;
    reference: string;
    type: string;
    status: string;
    partnerName?: string | null;
    scheduledDate?: string | null;
    completedDate?: string | null;
    notes?: string | null;
    warehouse?: { id: string; name: string; code: string } | null;
    responsible?: { id: string; name: string; email: string; role?: string } | null;
  } | null;
}

export interface MoveHistoryFilters {
  type?: string;
  status?: string;
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
  locationId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface MoveHistoryResponse {
  message?: string;
  total: number;
  limit: number;
  offset: number;
  items: StockMoveRecord[];
  moves: StockMoveRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface MoveDetailResponse {
  message?: string;
  data: StockMoveRecord;
}

