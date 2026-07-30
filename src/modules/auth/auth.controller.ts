import { type Request, type Response, type NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { success } from "../../utils/apiResponse.js";
import * as authService from "./auth.service.js";

const COOKIE_NAME = "refreshToken";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { payload, rawRefreshToken } = await authService.register(req.body);
  res.cookie(COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS);
  success(res, payload, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { payload, rawRefreshToken } = await authService.login(email, password);
  res.cookie(COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS);
  success(res, payload);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (!rawToken) {
    res.status(401).json({ success: false, error: { code: "NO_REFRESH_TOKEN", message: "No refresh token provided" } });
    return;
  }
  const { payload, rawRefreshToken } = await authService.refresh(rawToken);
  res.cookie(COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS);
  success(res, payload);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (rawToken) {
    await authService.logout(rawToken);
  }
  res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
  success(res, { message: "Logged out successfully" });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  success(res, user);
});
