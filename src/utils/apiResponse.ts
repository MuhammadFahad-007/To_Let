import { type Response } from "express";

export function success<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export function fail(
  res: Response,
  message: string,
  statusCode = 400,
  code = "BAD_REQUEST"
) {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}
