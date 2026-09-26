import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : (err.status || 500);

  if (statusCode >= 500) {
    console.error('❌ Server error:', err.message);
    if (process.env.NODE_ENV === 'development' && err.stack) {
      console.error(err.stack);
    }
  }

  // Never expose sensitive internal DB connection or stack traces to client
  const clientMessage = statusCode >= 500 && process.env.NODE_ENV !== 'development'
    ? 'Internal server error'
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: clientMessage,
    ...(err.details ? { details: err.details } : {}),
  });
}
