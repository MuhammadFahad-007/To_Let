import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const DAILY_LIMIT = 5;

const inquiryInclude = {
  listing: {
    select: { id: true, title: true, price: true, area: true, city: true },
  },
  tenant: {
    select: { id: true, name: true, email: true, phone: true },
  },
};

export async function create(tenantId: string, listingId: string, message: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.inquiry.count({
    where: {
      tenantId,
      createdAt: { gte: today },
    },
  });

  if (count >= DAILY_LIMIT) {
    throw new AppError(429, "RATE_LIMITED", `You can send up to ${DAILY_LIMIT} inquiries per day`);
  }

  return prisma.inquiry.create({
    data: { tenantId, listingId, message },
    include: inquiryInclude,
  });
}

export async function findSent(tenantId: string, page: number, limit: number) {
  const where = { tenantId };

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: inquiryInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findReceived(landlordId: string, page: number, limit: number) {
  const where = {
    listing: { landlordId },
  };

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: {
        ...inquiryInclude,
        listing: {
          select: { id: true, title: true, price: true, area: true, city: true, landlordId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateStatus(inquiryId: string, landlordId: string, status: "PENDING" | "RESPONDED" | "CLOSED") {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: { listing: { select: { landlordId: true } } },
  });
  if (!inquiry) throw new AppError(404, "NOT_FOUND", "Inquiry not found");
  if (inquiry.listing.landlordId !== landlordId) {
    throw new AppError(403, "FORBIDDEN", "You can only update inquiries on your own listings");
  }

  return prisma.inquiry.update({
    where: { id: inquiryId },
    data: { status },
    include: inquiryInclude,
  });
}
