import { type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

export function isOwner(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  prisma.listing
    .findUnique({ where: { id: req.params.id }, select: { landlordId: true } })
    .then((listing) => {
      if (!listing) {
        throw new AppError(404, "NOT_FOUND", "Listing not found");
      }
      if (listing.landlordId !== userId) {
        throw new AppError(403, "FORBIDDEN", "You do not own this listing");
      }
      next();
    })
    .catch(next);
}
