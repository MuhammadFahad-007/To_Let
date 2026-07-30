import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { buildWhereClause, buildOrderBy } from "./listing.filters.js";
import type { ListingFilters } from "./listing.filters.js";

const listingInclude = {
  landlord: {
    select: { id: true, name: true, email: true, phone: true },
  },
};

export async function create(landlordId: string, data: {
  title: string;
  description: string;
  price: number;
  sizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  floorNumber?: number | null;
  address: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  amenities?: string[];
}) {
  return prisma.listing.create({
    data: { ...data, landlordId },
    include: listingInclude,
  });
}

export async function findAll(query: ListingFilters & {
  page: number;
  limit: number;
}) {
  const where = buildWhereClause(query);
  const orderBy = buildOrderBy(query.sort);

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: listingInclude,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function findById(id: string) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: listingInclude,
  });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");
  return listing;
}

export async function update(id: string, userId: string, data: Record<string, unknown>) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");
  if (listing.landlordId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only edit your own listings");
  }
  return prisma.listing.update({
    where: { id },
    data,
    include: listingInclude,
  });
}

export async function remove(id: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");
  if (listing.landlordId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only delete your own listings");
  }
  await prisma.listing.delete({ where: { id } });
}

export async function updateStatus(id: string, userId: string, status: "AVAILABLE" | "RENTED" | "INACTIVE") {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");
  if (listing.landlordId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only update your own listings");
  }
  return prisma.listing.update({
    where: { id },
    data: { status },
    include: listingInclude,
  });
}

export async function findByLandlord(landlordId: string) {
  return prisma.listing.findMany({
    where: { landlordId },
    include: listingInclude,
    orderBy: { createdAt: "desc" },
  });
}
