// Run on YOUR computer whenever a customer needs a license.
//
// Usage:
//   node scripts/generate-license.js <machineId> <customerName> [expiryDateISO]
//
// Example:
//   node scripts/generate-license.js 3f9a1c...e21 "ABC Traders" 2027-12-31
//   node scripts/generate-license.js 3f9a1c...e21 "ABC Traders"        (no expiry = perpetual)
//
// The customer gets their <machineId> from the app's Activation screen
// (wired to license:getMachineId in main.ts) and sends it to you - by
// phone, WhatsApp, email, whatever. You run this script, send back the
// printed LICENSE KEY, they paste it into the Activation screen.

const crypto = require('crypto');

// Paste your PRIVATE key here ONLY on your own machine, only while
// generating licenses. Do not leave it in this file if the script itself
// ever ends up in a shared or committed location - keep this file local.
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIFFZpJBipMchvvUiU/1VgMbEJR9DqbhvaC/Eh+9AHclM
-----END PRIVATE KEY-----`;

const [, , machineId, customer, expiry] = process.argv;

if (!machineId || !customer) {
  console.error('Usage: node generate-license.js <machineId> <customerName> [expiryDateISO]');
  process.exit(1);
}

const payload = {
  machineId,
  customer,
  issuedAt: new Date().toISOString(),
  expiresAt: expiry ? new Date(expiry).toISOString() : null
};

const signature = crypto.sign(null, Buffer.from(JSON.stringify(payload)), PRIVATE_KEY).toString('base64');
const licenseString = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

console.log('\nCustomer:', customer);
console.log('Machine :', machineId);
console.log('Expires :', payload.expiresAt || 'never (perpetual)');
console.log('\n=== LICENSE KEY — send this to the customer ===\n');
console.log(licenseString);
console.log('');