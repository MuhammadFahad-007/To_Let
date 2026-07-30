import { type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { success } from "../../utils/apiResponse.js";
import * as listingService from "./listing.service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const listing = await listingService.create(req.user!.id, req.body);
  success(res, listing, 201);
});

export const findAll = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, minPrice, maxPrice, bedrooms, bathrooms, area, city, status, sort } = req.query as Record<string, string | undefined>;

  const result = await listingService.findAll({
    page: Number(page) || 1,
    limit: Math.min(Number(limit) || 20, 100),
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,
    area,
    city,
    status: status as "AVAILABLE" | "RENTED" | "INACTIVE" | undefined,
    sort: sort || "newest",
  });

  success(res, result);
});

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const listing = await listingService.findById(req.params.id);
  success(res, listing);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const listing = await listingService.update(req.params.id, req.user!.id, req.body);
  success(res, listing);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await listingService.remove(req.params.id, req.user!.id);
  success(res, { message: "Listing deleted successfully" });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const listing = await listingService.updateStatus(req.params.id, req.user!.id, req.body.status);
  success(res, listing);
});

export const findByLandlord = asyncHandler(async (req: Request, res: Response) => {
  const listings = await listingService.findByLandlord(req.params.landlordId);
  success(res, listings);
});
