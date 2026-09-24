import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

let prisma: PrismaClient;

export function getDatabasePath(): string {
  let userDataPath: string;
  let isElectron = false;
  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      userDataPath = app.getPath('userData');
      isElectron = true;
    } else {
      userDataPath = path.join(process.cwd(), 'database-data');
    }
  } catch (e) {
    userDataPath = path.join(process.cwd(), 'database-data');
  }

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'aanzara_billing.db');

  if (isElectron) {
    const needsCopy = !fs.existsSync(dbPath) || (fs.existsSync(dbPath) && fs.statSync(dbPath).size === 0);
    if (needsCopy) {
      let sourceDbPath = path.join((process as any).resourcesPath || '', 'database-data', 'aanzara_billing.db');
      if (!fs.existsSync(sourceDbPath)) {
        sourceDbPath = path.join(process.cwd(), 'database-data', 'aanzara_billing.db');
      }

      if (fs.existsSync(sourceDbPath) && fs.statSync(sourceDbPath).size > 0) {
        try {
          fs.copyFileSync(sourceDbPath, dbPath);
          console.log(`Copied initial database template from ${sourceDbPath} to ${dbPath}`);
        } catch (err) {
          console.error('Failed to copy initial database template:', err);
        }
      }
    }
  }

  return dbPath;
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const dbPath = getDatabasePath();
    console.log('[DB] Using database file at:', dbPath);   // ADD THIS LINE
    const normalizedPath = path.resolve(dbPath).replace(/\\/g, '/');
    const dbUrl = `file:${normalizedPath}`;
    process.env.DATABASE_URL = dbUrl;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return prisma;
}

export default getPrismaClient;
