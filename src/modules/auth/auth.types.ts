export interface AuthPayload {
  user: {
    id: string;
    name: string;
    email: string;
    role: "TENANT" | "LANDLORD" | "ADMIN";
  };
  accessToken: string;
}
