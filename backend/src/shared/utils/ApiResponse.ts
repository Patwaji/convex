import { Response } from 'express';

/**
 * Standardized API response helper.
 * All endpoints use this for consistent response format:
 *   Success:   { success: true, data: <payload>, message?: string }
 *   Error:     { success: false, error: { code, message } }
 *   Paginated: { success: true, data: [], pagination: { page, limit, total, totalPages } }
 */

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(message && { message }),
    });
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string
  ): Response {
    return res.status(200).json({
      success: true,
      data,
      pagination,
      ...(message && { message }),
    });
  }

  static error(
    res: Response,
    statusCode: number,
    code: string,
    message: string
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: { code, message },
    });
  }
}
