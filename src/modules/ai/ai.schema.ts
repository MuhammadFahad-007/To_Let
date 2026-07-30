import { z } from "zod";

export const recommendSchema = z.object({
  query: z.string().min(3, "Query must be at least 3 characters").max(500, "Query too long"),
});
