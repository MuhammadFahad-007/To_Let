import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { buildWhereClause } from "../listings/listing.filters.js";
import { fallbackSearch } from "./fallbackSearch.js";
import { EXTRACT_FILTERS_PROMPT } from "./prompts.js";
import type { ParsedFilters, RecommendResult } from "./ai.types.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const listingInclude = {
  landlord: { select: { id: true, name: true, email: true, phone: true } },
};

function clampFilters(filters: ParsedFilters): ParsedFilters {
  return {
    maxPrice:
      filters.maxPrice !== undefined
        ? Math.max(0, Math.min(9_999_999, filters.maxPrice))
        : undefined,
    minBedrooms:
      filters.minBedrooms !== undefined
        ? Math.max(0, Math.min(50, filters.minBedrooms))
        : undefined,
    area: filters.area ? filters.area.trim() : undefined,
    amenities: filters.amenities ? filters.amenities.slice(0, 20) : undefined,
  };
}

async function callAI(query: string): Promise<ParsedFilters | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const result = await model.generateContent(
      `${EXTRACT_FILTERS_PROMPT}\n\nQuery: "${query}"`,
      { signal: controller.signal }
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    return clampFilters(JSON.parse(cleaned) as ParsedFilters);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function recommend(query: string): Promise<RecommendResult> {
  let filters = await callAI(query);
  let usedFallback = false;

  const isEmpty =
    !filters ||
    (filters.maxPrice === undefined &&
      filters.minBedrooms === undefined &&
      !filters.area &&
      (!filters.amenities || filters.amenities.length === 0));

  if (isEmpty) {
    filters = {};
    usedFallback = true;
  }

  const where = buildWhereClause({
    maxPrice: filters.maxPrice,
    bedrooms: filters.minBedrooms,
    area: filters.area,
    sort: "newest",
    status: "AVAILABLE",
  });

  if (filters.amenities && filters.amenities.length > 0) {
    where.amenities = { hasSome: filters.amenities };
  }

  let items: Record<string, unknown>[];
  let total: number;

  try {
    [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: listingInclude,
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.listing.count({ where }),
    ]);
  } catch {
    items = await fallbackSearch(query);
    total = items.length;
    usedFallback = true;
    filters = {};
  }

  if (items.length === 0 && !usedFallback) {
    items = await fallbackSearch(query);
    total = items.length;
    usedFallback = true;
    filters = {};
  }

  return { query, parsedFilters: filters, usedFallback, results: items, total };
}

export async function findSimilar(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");

  const priceRange = Number(listing.price) * 0.3;

  return prisma.listing.findMany({
    where: {
      id: { not: listingId },
      status: "AVAILABLE",
      price: {
        gte: Number(listing.price) - priceRange,
        lte: Number(listing.price) + priceRange,
      },
      area: { contains: listing.area, mode: "insensitive" },
      bedrooms: {
        gte: Math.max(0, listing.bedrooms - 1),
        lte: listing.bedrooms + 1,
      },
    },
    include: listingInclude,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
