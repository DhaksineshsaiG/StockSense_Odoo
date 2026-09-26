import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouseController';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'warehouses' });
});

// Warehouse collection endpoints
router.get('/', optionalAuthMiddleware, WarehouseController.list);
router.post('/', authMiddleware, WarehouseController.create);

// Warehouse locations nested endpoints
router.get('/:warehouseId/locations', optionalAuthMiddleware, WarehouseController.listLocations);
router.post('/:warehouseId/locations', authMiddleware, WarehouseController.createLocation);

// Single warehouse endpoints
router.get('/:id', optionalAuthMiddleware, WarehouseController.getById);
router.patch('/:id', authMiddleware, WarehouseController.update);
router.delete('/:id', authMiddleware, requireRole('MANAGER'), WarehouseController.delete);

export default router;
