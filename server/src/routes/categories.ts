import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'categories' });
});

// Category endpoints
router.get('/', optionalAuthMiddleware, CategoryController.list);
router.get('/:id', optionalAuthMiddleware, CategoryController.getById);
router.post('/', authMiddleware, CategoryController.create);
router.patch('/:id', authMiddleware, CategoryController.update);
router.delete('/:id', authMiddleware, requireRole('MANAGER'), CategoryController.delete);

export default router;
