import { PrismaClient } from "@prisma/client";

// Singleton Prisma client
let prismaClient: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === "development" 
        ? ["query", "error", "warn"] 
        : ["error"]
    });
  }
  return prismaClient;
}

// Graceful shutdown
export async function disconnectDb(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

// Health check
export async function checkDbConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
