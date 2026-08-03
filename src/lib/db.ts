import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DB_FILENAME = "product-all-log.db";

function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Locate SQLite DB.
 * Docker/NAS: set PRODUCT_ALL_LOG_DB_PATH=/app/data/product-all-log.db (volume-mounted).
 */
function resolveBundledDbPath(): string {
  const fromEnv = process.env.PRODUCT_ALL_LOG_DB_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const candidates = [
    path.join(process.cwd(), "data", DB_FILENAME),
    path.join(process.cwd(), "..", "data", DB_FILENAME),
    path.join(__dirname, "..", "..", "data", DB_FILENAME),
    path.join(__dirname, "..", "..", "..", "data", DB_FILENAME),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

/**
 * Writable DB path.
 * Long-running Docker/NAS uses the data volume directly.
 * Serverless (if ever used) copies into /tmp.
 */
function resolveWritableDbPath(bundledPath: string): string {
  if (!isServerlessRuntime()) return bundledPath;

  const tmpPath = path.join("/tmp", DB_FILENAME);
  try {
    const bundledExists = fs.existsSync(bundledPath);
    const tmpExists = fs.existsSync(tmpPath);

    if (bundledExists && !tmpExists) {
      fs.copyFileSync(bundledPath, tmpPath);
    } else if (bundledExists && tmpExists) {
      const bundledStat = fs.statSync(bundledPath);
      const tmpStat = fs.statSync(tmpPath);
      if (bundledStat.mtimeMs > tmpStat.mtimeMs) {
        fs.copyFileSync(bundledPath, tmpPath);
      }
    } else if (!bundledExists && !tmpExists) {
      throw new Error(
        `SQLite DB not found at ${bundledPath}. Mount data/${DB_FILENAME} or set PRODUCT_ALL_LOG_DB_PATH.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to prepare SQLite DB: ${message}`);
  }

  return tmpPath;
}

let db: DatabaseSync | null = null;
let openedPath: string | null = null;

export function getProductLogDb(): DatabaseSync {
  const bundledPath = resolveBundledDbPath();
  const dbPath = resolveWritableDbPath(bundledPath);

  if (db && openedPath === dbPath) return db;

  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `SQLite DB not found at ${dbPath}. ` +
        `For Docker/NAS, mount ./data and set PRODUCT_ALL_LOG_DB_PATH=/app/data/${DB_FILENAME}.`,
    );
  }

  db = new DatabaseSync(dbPath);
  openedPath = dbPath;
  return db;
}

export function getProductLogDbPath(): string {
  return resolveWritableDbPath(resolveBundledDbPath());
}

export function getBundledProductLogDbPath(): string {
  return resolveBundledDbPath();
}
