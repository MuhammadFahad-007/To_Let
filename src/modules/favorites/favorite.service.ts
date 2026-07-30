import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const favoriteInclude = {
  listing: {
    include: {
      landlord: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  },
};

export async function create(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");

  try {
    return await prisma.favorite.create({
      data: { userId, listingId },
      include: favoriteInclude,
    });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") {
      throw new AppError(409, "ALREADY_FAVORITED", "Listing is already in your favorites");
    }
    throw err;
  }
}

export async function findAll(userId: string, page: number, limit: number) {
  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      include: favoriteInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.favorite.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function remove(userId: string, id: string) {
  const favorite = await prisma.favorite.findUnique({ where: { id } });
  if (!favorite) throw new AppError(404, "NOT_FOUND", "Favorite not found");
  if (favorite.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only remove your own favorites");
  }
  await prisma.favorite.delete({ where: { id } });
}
