import { Request, Response, NextFunction } from "express";
import { BaseError, NotFoundError } from "../types/errors.ts";
import logger from "../logger.ts";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err instanceof BaseError) {
    const errorResponse: {
      success: false,
      error: string,
      statusCode: number,
      errorCode?: string
    } = {
      success: false,
      error: err.message,
      statusCode: err.statusCode
    };

    if (err.errorCode) {
      errorResponse.errorCode = err.errorCode;
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    statusCode: 500
  });
};

