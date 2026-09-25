import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getMachineId } from './machineId';

/**
 * Public key baked into the app. Safe to ship - it can only VERIFY a license,
 * never create one. Generate the matching keypair once with
 * `scripts/generate-keypair.js`, paste the PUBLIC key here, and keep the
 * PRIVATE key somewhere offline (password manager, USB drive) - never in
 * this repo, never in the built app.
 */
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAhfM3AjgM2ZhTNV/0A7kg2izyzFE2a6+LnykrFpz1mRQ=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  machineId: string;
  customer: string;
  issuedAt: string;
  expiresAt: string | null; // null = perpetual license
}

interface LicenseFile {
  payload: LicensePayload;
  signature: string; // base64
}

function licenseFilePath(): string {
  return path.join(app.getPath('userData'), 'license.dat');
}

/** Cryptographically verifies a license string against the bundled public key
 *  and the CURRENT machine's fingerprint. Does not trust any stored flag -
 *  re-derives everything from the signed payload every time it's called. */
export function verifyLicenseString(
  licenseString: string
): { valid: true; payload: LicensePayload } | { valid: false; reason: string } {
  let license: LicenseFile;
  try {
    license = JSON.parse(Buffer.from(licenseString.trim(), 'base64').toString('utf8'));
  } catch {
    return { valid: false, reason: 'License key is not readable' };
  }

  const { payload, signature } = license || ({} as LicenseFile);
  if (!payload || !signature) return { valid: false, reason: 'Malformed license key' };

  let signatureOk = false;
  try {
    signatureOk = crypto.verify(
      null, // Ed25519 keys carry their own algorithm
      Buffer.from(JSON.stringify(payload)),
      LICENSE_PUBLIC_KEY,
      Buffer.from(signature, 'base64')
    );
  } catch {
    return { valid: false, reason: 'License key is invalid' };
  }
  if (!signatureOk) return { valid: false, reason: 'License signature does not match' };

  const currentMachineId = getMachineId();
  if (payload.machineId !== currentMachineId) {
    return { valid: false, reason: 'This license is registered to a different computer' };
  }

  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: 'This license has expired' };
  }

  return { valid: true, payload };
}

/** Checks the license saved on this machine (called on every app startup). */
export function checkStoredLicense():
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: string } {
  const filePath = licenseFilePath();
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: 'No license activated on this computer' };
  }
  const licenseString = fs.readFileSync(filePath, 'utf8');
  return verifyLicenseString(licenseString);
}

/** Validates and saves a new license key to this machine's userData folder. */
export function activateLicense(
  licenseString: string
): { valid: true; payload: LicensePayload } | { valid: false; reason: string } {
  const result = verifyLicenseString(licenseString);
  if (result.valid) {
    fs.writeFileSync(licenseFilePath(), licenseString.trim(), 'utf8');
  }
  return result;
}