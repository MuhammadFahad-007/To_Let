import { z } from "zod";

export const createFavoriteSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
});

export const favoriteQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
