import { Router } from 'express';
import { ReorderRuleController } from '../controllers/reorderRuleController';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'reorder-rules' });
});

// Direct reorder rule endpoints
router.get('/:id', optionalAuthMiddleware, ReorderRuleController.getById);
router.patch('/:id', authMiddleware, ReorderRuleController.update);
router.delete('/:id', authMiddleware, requireRole('MANAGER'), ReorderRuleController.delete);

export default router;
