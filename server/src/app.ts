import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import productRoutes from './routes/products';
import warehouseRoutes from './routes/warehouses';
import operationRoutes from './routes/operations';
import ledgerRoutes from './routes/ledger';
import categoryRoutes from './routes/categories';
import reorderRuleRoutes from './routes/reorderRules';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'StockSense API',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reorder-rules', reorderRuleRoutes);

// ─── Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

export default app;
