import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dashboard' });
});

// ─── Dashboard Routes ─────────────────────────────────────────────────────
// Base path: /api/dashboard
router.get('/', optionalAuthMiddleware, DashboardController.getDashboard);

export default router;
