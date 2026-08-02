import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite path for product_offerings + audit_logs.
 * Default: data/product-all-log.db inside this Next.js project.
 */
function resolveDbPath(): string {
  const fromEnv = process.env.PRODUCT_ALL_LOG_DB_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "data", "product-all-log.db");
}

let db: DatabaseSync | null = null;
let openedPath: string | null = null;

export function getProductLogDb(): DatabaseSync {
  const dbPath = resolveDbPath();

  if (db && openedPath === dbPath) return db;

  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `SQLite DB not found at ${dbPath}. Set PRODUCT_ALL_LOG_DB_PATH in .env.local.`,
    );
  }

  db = new DatabaseSync(dbPath);
  openedPath = dbPath;
  return db;
}

export function getProductLogDbPath(): string {
  return resolveDbPath();
}
