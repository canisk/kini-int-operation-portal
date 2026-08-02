import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DB_FILENAME = "product-all-log.db";

function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Locate the bundled SQLite file. On Vercel, cwd and tracing layout can vary,
 * so we probe several candidates.
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
 * Writable DB path. Vercel’s app filesystem is read-only — copy into /tmp.
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
      // Refresh /tmp copy if the deployed bundle is newer (new deploy)
      const bundledStat = fs.statSync(bundledPath);
      const tmpStat = fs.statSync(tmpPath);
      if (bundledStat.mtimeMs > tmpStat.mtimeMs) {
        fs.copyFileSync(bundledPath, tmpPath);
      }
    } else if (!bundledExists && !tmpExists) {
      throw new Error(
        `SQLite DB not found at ${bundledPath}. Include data/${DB_FILENAME} in the deploy.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to prepare SQLite DB for serverless: ${message}`);
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
      `SQLite DB not found at ${dbPath} (bundled candidate: ${bundledPath}). ` +
        `Set PRODUCT_ALL_LOG_DB_PATH or ensure data/${DB_FILENAME} is traced into the serverless bundle.`,
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
