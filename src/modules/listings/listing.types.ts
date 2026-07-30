export interface ListingResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  sizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  floorNumber: number | null;
  address: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  status: "AVAILABLE" | "RENTED" | "INACTIVE";
  landlordId: string;
  landlord?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
