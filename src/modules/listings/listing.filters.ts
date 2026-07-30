export interface ListingFilters {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: string;
  city?: string;
  status?: "AVAILABLE" | "RENTED" | "INACTIVE";
  sort: string;
}

export function buildWhereClause(filters: ListingFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) (where.price as Record<string, unknown>).gte = filters.minPrice;
    if (filters.maxPrice !== undefined) (where.price as Record<string, unknown>).lte = filters.maxPrice;
  }

  if (filters.bedrooms !== undefined) where.bedrooms = filters.bedrooms;
  if (filters.bathrooms !== undefined) where.bathrooms = filters.bathrooms;
  if (filters.status) where.status = filters.status;

  if (filters.area) where.area = { contains: filters.area, mode: "insensitive" };
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };

  return where;
}

export function buildOrderBy(sort: string): Record<string, string> {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "oldest":
      return { createdAt: "asc" };
    default:
      return { createdAt: "desc" };
  }
}
