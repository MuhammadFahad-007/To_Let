import { z } from "zod";

export const createInquirySchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message too long"),
});

export const inquiryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "RESPONDED", "CLOSED"]),
});
