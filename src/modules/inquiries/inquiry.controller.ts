import { type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { success } from "../../utils/apiResponse.js";
import * as inquiryService from "./inquiry.service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { listingId, message } = req.body;
  const inquiry = await inquiryService.create(req.user!.id, listingId, message);
  success(res, inquiry, 201);
});

export const findSent = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const result = await inquiryService.findSent(req.user!.id, page, limit);
  success(res, result);
});

export const findReceived = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const result = await inquiryService.findReceived(req.user!.id, page, limit);
  success(res, result);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await inquiryService.updateStatus(req.params.id, req.user!.id, req.body.status);
  success(res, inquiry);
});
