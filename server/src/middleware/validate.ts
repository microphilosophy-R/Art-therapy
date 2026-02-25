import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate =
  (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      (result.error as ZodError).issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });
      return res.status(422).json({ message: 'Validation failed', errors });
    }
    req[target] = result.data;
    next();
  };
