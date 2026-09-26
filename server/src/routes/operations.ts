import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { DeliveryController } from '../controllers/deliveryController';
import { TransferController } from '../controllers/transferController';
import { AdjustmentController } from '../controllers/adjustmentController';
import { MoveHistoryController } from '../controllers/moveHistoryController';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'operations' });
});

// ─── Receipts Operations Routes ───────────────────────────────────────────
// Base path: /api/operations/receipts
router.post('/receipts', optionalAuthMiddleware, ReceiptController.create);
router.get('/receipts', optionalAuthMiddleware, ReceiptController.list);
router.get('/receipts/:id', optionalAuthMiddleware, ReceiptController.getById);
router.patch('/receipts/:id', optionalAuthMiddleware, ReceiptController.update);
router.post('/receipts/:id/validate', optionalAuthMiddleware, ReceiptController.validate);
router.post('/receipts/:id/cancel', optionalAuthMiddleware, ReceiptController.cancel);

// ─── Deliveries Operations Routes ─────────────────────────────────────────
// Base path: /api/operations/deliveries
router.post('/deliveries', optionalAuthMiddleware, DeliveryController.create);
router.get('/deliveries', optionalAuthMiddleware, DeliveryController.list);
router.get('/deliveries/:id', optionalAuthMiddleware, DeliveryController.getById);
router.patch('/deliveries/:id', optionalAuthMiddleware, DeliveryController.update);
router.post('/deliveries/:id/check-availability', optionalAuthMiddleware, DeliveryController.checkAvailability);
router.post('/deliveries/:id/validate', optionalAuthMiddleware, DeliveryController.validate);
router.post('/deliveries/:id/cancel', optionalAuthMiddleware, DeliveryController.cancel);

// ─── Internal Transfers Operations Routes ─────────────────────────────────
// Base path: /api/operations/transfers
router.post('/transfers', optionalAuthMiddleware, TransferController.create);
router.get('/transfers', optionalAuthMiddleware, TransferController.list);
router.get('/transfers/:id', optionalAuthMiddleware, TransferController.getById);
router.patch('/transfers/:id', optionalAuthMiddleware, TransferController.update);
router.post('/transfers/:id/validate', optionalAuthMiddleware, TransferController.validate);
router.post('/transfers/:id/cancel', optionalAuthMiddleware, TransferController.cancel);

// ─── Inventory Adjustments Operations Routes ──────────────────────────────
// Base path: /api/operations/adjustments
router.post('/adjustments', optionalAuthMiddleware, AdjustmentController.create);
router.get('/adjustments', optionalAuthMiddleware, AdjustmentController.list);
router.get('/adjustments/:id', optionalAuthMiddleware, AdjustmentController.getById);
router.patch('/adjustments/:id', optionalAuthMiddleware, AdjustmentController.update);
router.post('/adjustments/:id/validate', optionalAuthMiddleware, AdjustmentController.validate);
router.post('/adjustments/:id/cancel', optionalAuthMiddleware, AdjustmentController.cancel);

// ─── Stock Moves / Move History Routes ────────────────────────────────────
// Base path: /api/operations/moves
router.get('/moves', optionalAuthMiddleware, MoveHistoryController.list);
router.get('/moves/:id', optionalAuthMiddleware, MoveHistoryController.getById);

export default router;


