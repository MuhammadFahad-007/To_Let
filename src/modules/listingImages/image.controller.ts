import { type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { success } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import * as imageService from "./image.service.js";

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, "NO_FILE", "No image file provided");
  }
  const image = await imageService.upload(req.params.id, req.file);
  success(res, image, 201);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await imageService.remove(req.params.id, req.params.imageId);
  success(res, { message: "Image deleted successfully" });
});
