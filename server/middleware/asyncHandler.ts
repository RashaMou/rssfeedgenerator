import { Request, Response, NextFunction } from "express";

export const asyncHandler =
  (routeHandler: (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(routeHandler(req, res, next)).catch(next);
  };

