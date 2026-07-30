import { z } from "zod";

export const createListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive").max(9999999.99, "Price too high"),
  sizeSqft: z.number().positive("Size must be positive").max(999999.99, "Size too high"),
  bedrooms: z.number().int().min(0).max(50, "Bedrooms must be 50 or less"),
  bathrooms: z.number().int().min(0).max(50, "Bathrooms must be 50 or less"),
  floorNumber: z.number().int().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  area: z.string().min(1, "Area is required"),
  city: z.string().min(1, "City is required"),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  amenities: z.array(z.string()).optional().default([]),
});

export const updateListingSchema = createListingSchema.partial();

export const listingQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(["AVAILABLE", "RENTED", "INACTIVE"]).optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "oldest"]).optional().default("newest"),
});

export const updateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "RENTED", "INACTIVE"]),
});
