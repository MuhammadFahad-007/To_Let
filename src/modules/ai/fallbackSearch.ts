import { prisma } from "../../lib/prisma.js";

const listingInclude = {
  landlord: { select: { id: true, name: true, email: true, phone: true } },
};

export async function fallbackSearch(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const priceMatch = query.match(/(\d+)\s*k?/);
  const maxPrice = priceMatch
    ? Number(priceMatch[1]) * (query.includes("k") ? 1000 : 1)
    : undefined;

  const bedMatch = query.match(/(\d+)\s*bed/);
  const bedrooms = bedMatch ? Number(bedMatch[1]) : undefined;

  const where: Record<string, unknown> = { status: "AVAILABLE" };

  if (words.length > 0) {
    where.OR = words.flatMap((word) => [
      { area: { contains: word, mode: "insensitive" } },
      { city: { contains: word, mode: "insensitive" } },
      { address: { contains: word, mode: "insensitive" } },
      { title: { contains: word, mode: "insensitive" } },
      { description: { contains: word, mode: "insensitive" } },
    ]);
  }

  if (maxPrice) where.price = { lte: maxPrice };
  if (bedrooms) where.bedrooms = bedrooms;

  return prisma.listing.findMany({
    where,
    include: listingInclude,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
