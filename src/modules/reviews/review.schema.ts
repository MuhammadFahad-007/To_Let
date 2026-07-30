import { z } from "zod";

export const createReviewSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(1000, "Comment too long"),
});
