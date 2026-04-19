import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to the Express error middleware.
 */
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncWrapper(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
