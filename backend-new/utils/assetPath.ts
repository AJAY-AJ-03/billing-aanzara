import path from 'path';
import fs from 'fs';

/**
 * Resolves a static asset (logo, QR code, etc.) from the top-level /assets folder.
 *
 * - In dev (npm run dev / tsc -w), files run from dist-backend/backend-new/utils,
 *   so we walk up to the project root's /assets folder.
 * - In a packaged Electron build, /assets is shipped via `extraResources`
 *   (see package.json build.extraResources), so it lives next to database-data
 *   under process.resourcesPath.
 */
export function resolveAssetPath(fileName: string): string {
  const isPackaged = !!(process as any).resourcesPath && (process as any).resourcesPath !== process.cwd();

  const packagedPath = path.join((process as any).resourcesPath || '', 'assets', fileName);
  if (isPackaged && fs.existsSync(packagedPath)) {
    return packagedPath;
  }

  // Dev fallback: project root /assets (works whether running via ts-node or compiled dist-backend)
  const devPath = path.join(process.cwd(), 'assets', fileName);
  return devPath;
}

export function assetExists(fileName: string): boolean {
  try {
    return fs.existsSync(resolveAssetPath(fileName));
  } catch {
    return false;
  }
}
