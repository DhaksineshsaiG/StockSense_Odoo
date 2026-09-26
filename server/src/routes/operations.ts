import { Router } from 'express';

const router = Router();

// Placeholder — full routes implemented in Step 3
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'operations' });
});

export default router;
