import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'products' });
});

// Product collection endpoints
router.get('/', optionalAuthMiddleware, ProductController.list);
router.post('/', authMiddleware, ProductController.create);

// Reorder rules nested under product
router.get('/:id/reorder-rules', optionalAuthMiddleware, ProductController.getReorderRules);
router.post('/:id/reorder-rules', authMiddleware, ProductController.createReorderRule);

// Initial stock / manual stock setting
router.post('/:id/stock', authMiddleware, ProductController.setStock);

// Single product resource endpoints
router.get('/:id', optionalAuthMiddleware, ProductController.getById);
router.patch('/:id', authMiddleware, ProductController.update);
router.delete('/:id', authMiddleware, requireRole('MANAGER'), ProductController.delete);

export default router;
