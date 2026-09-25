// Run ONCE, on your own computer, before your first release:
//   node scripts/generate-keypair.js
//
// Paste the PUBLIC key into backend-new/utils/license.ts (LICENSE_PUBLIC_KEY).
// Save the PRIVATE key somewhere safe and offline (password manager, USB
// drive). Never commit it, never put it inside the app - anyone who has it
// can generate valid licenses for your software.

const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('\n=== PUBLIC KEY — paste into backend-new/utils/license.ts ===\n');
console.log(publicKey);
console.log('=== PRIVATE KEY — keep offline, never commit ===\n');
console.log(privateKey);