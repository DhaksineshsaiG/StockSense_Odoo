import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'locations' });
});

// Location routes
router.get('/', optionalAuthMiddleware, LocationController.list);
router.get('/:id', optionalAuthMiddleware, LocationController.getById);
router.patch('/:id', authMiddleware, LocationController.update);
router.delete('/:id', authMiddleware, requireRole('MANAGER'), LocationController.delete);

export default router;
