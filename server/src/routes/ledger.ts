import { Router } from 'express';
import { MoveHistoryController } from '../controllers/moveHistoryController';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ledger' });
});

// ─── Stock Ledger / Move History Routes ────────────────────────────────────
// Base path: /api/ledger
router.get('/', optionalAuthMiddleware, MoveHistoryController.list);
router.get('/moves', optionalAuthMiddleware, MoveHistoryController.list);
router.get('/moves/:id', optionalAuthMiddleware, MoveHistoryController.getById);
router.get('/:id', optionalAuthMiddleware, MoveHistoryController.getById);

export default router;
