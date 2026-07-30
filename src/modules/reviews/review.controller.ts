import { type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { success } from "../../utils/apiResponse.js";
import * as reviewService from "./review.service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { listingId, rating, comment } = req.body;
  const review = await reviewService.create(req.user!.id, listingId, rating, comment);
  success(res, review, 201);
});

export const findByListing = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await reviewService.findByListing(req.params.listingId);
  success(res, reviews);
});
