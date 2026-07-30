import { type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { success } from "../../utils/apiResponse.js";
import * as favoriteService from "./favorite.service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { listingId } = req.body;
  const favorite = await favoriteService.create(req.user!.id, listingId);
  success(res, favorite, 201);
});

export const findAll = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const result = await favoriteService.findAll(req.user!.id, page, limit);
  success(res, result);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await favoriteService.remove(req.user!.id, req.params.id);
  success(res, { message: "Favorite removed successfully" });
});
