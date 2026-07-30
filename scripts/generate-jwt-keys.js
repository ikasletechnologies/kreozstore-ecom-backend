#!/usr/bin/env node
/**
 * Generates an RS256 keypair for JWT_ACCESS_PRIVATE_KEY / JWT_ACCESS_PUBLIC_KEY and prints
 * them pre-escaped (newlines as literal `\n`) so they paste directly into a single-line .env
 * entry. Run with: node scripts/generate-jwt-keys.js
 */
const crypto = require('node:crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const toEnvLine = (value) => value.trim().split('\n').join('\\n');

console.log(`JWT_ACCESS_PRIVATE_KEY=${toEnvLine(privateKey)}`);
console.log(`JWT_ACCESS_PUBLIC_KEY=${toEnvLine(publicKey)}`);
