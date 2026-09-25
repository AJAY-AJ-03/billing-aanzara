import { machineIdSync } from 'node-machine-id';
import crypto from 'crypto';

/**
 * Returns a stable, hashed identifier for THIS physical computer.
 *
 * Reads the OS-level machine GUID:
 *  - Windows: HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid
 *  - macOS:   IOPlatformUUID
 *  - Linux:   /etc/machine-id or /var/lib/dbus/machine-id
 *
 * This value survives app reinstalls/updates on the SAME machine, but is
 * different on every other machine - so a license bound to it stops working
 * the moment someone copies the app (with or without its database) elsewhere.
 */
export function getMachineId(): string {
  const raw = machineIdSync(true); // true = return the raw, un-hashed OS GUID
  return crypto.createHash('sha256').update(raw).digest('hex');
}