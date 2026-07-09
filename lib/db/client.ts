import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabasePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const match = url.match(/^file:(.+)$/);
  if (!match) {
    throw new Error(`Unsupported DATABASE_URL format: ${url}`);
  }

  const filePath = match[1].replace(/^\.?\//, "");
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function createPrismaClient(): PrismaClient {
  const dbPath = resolveDatabasePath();
  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isClientReady(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    client?.generation &&
      client?.image &&
      client?.profileSettings &&
      client?.usageLog
  );
}

function getPrismaClient(): PrismaClient {
  if (isClientReady(globalForPrisma.prisma)) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();
