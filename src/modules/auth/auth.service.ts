import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword, comparePassword, hashToken } from "../../utils/hash.js";
import { generateAccessToken } from "../../utils/jwt.js";
import type { AuthPayload } from "./auth.types.js";

const REFRESH_TOKEN_BYTES = 64;
const REFRESH_TOKEN_DAYS = 7;

function generateRawToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

async function createRefreshTokenRecord(userId: string): Promise<string> {
  const raw = generateRawToken();
  const hashed = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashed, expiresAt },
  });
  return raw;
}

async function buildAuthPayload(userId: string): Promise<{ payload: AuthPayload; rawRefreshToken: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const rawRefreshToken = await createRefreshTokenRecord(user.id);
  return {
    payload: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role as "TENANT" | "LANDLORD" | "ADMIN" },
      accessToken,
    },
    rawRefreshToken,
  };
}

export async function register(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "TENANT" | "LANDLORD";
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
  }
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
    },
  });
  return buildAuthPayload(user.id);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  return buildAuthPayload(user.id);
}

export async function refresh(rawToken: string) {
  const hashed = hashToken(rawToken);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash: hashed, revoked: false },
    include: { user: true },
  });
  if (!record) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid");
  }
  if (record.expiresAt < new Date()) {
    throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Refresh token has expired");
  }
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  return buildAuthPayload(record.user.id);
}

export async function logout(rawToken: string) {
  const hashed = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashed, revoked: false },
    data: { revoked: true },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}
