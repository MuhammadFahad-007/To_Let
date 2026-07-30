export interface ParsedFilters {
  maxPrice?: number;
  minBedrooms?: number;
  area?: string;
  amenities?: string[];
}

export interface RecommendResult {
  query: string;
  parsedFilters: ParsedFilters;
  usedFallback: boolean;
  results: Record<string, unknown>[];
  total: number;
}
