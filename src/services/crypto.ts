/**
 * End-to-end encryption for sync.
 *
 * Uses Web Crypto API (available in browsers and Tauri WebView):
 * - AES-GCM 256-bit for symmetric encryption
 * - PBKDF2 with SHA-256 for key derivation (600k iterations — OWASP 2023 recommendation)
 * - Random 16-byte salt + 12-byte IV per encryption
 *
 * The sync code is a human-readable encoding of (salt + key material).
 * The server NEVER sees the plaintext key — only encrypted blobs.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits (AES-GCM standard)
const KEY_LENGTH = 256; // bits

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded 12-byte initialization vector */
  iv: string;
  /** Base64-encoded 16-byte salt used for PBKDF2 key derivation */
  salt: string;
  /** PBKDF2 iteration count used (for forward compatibility) */
  iterations: number;
}

export interface SyncCode {
  /** The human-readable sync code (share with other device) */
  code: string;
  /** The raw salt bytes (base64) — needed for decryption */
  salt: string;
}

// ── Base64 helpers ──

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Sync code generation ──

/**
 * Generate a new sync code.
 * The code is a human-readable string that encodes a random key + salt.
 * Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (50 chars + 9 dashes)
 *
 * The salt is stored separately in the sync metadata on the server.
 * The key material is derived from the code via PBKDF2.
 */
export function generateSyncCode(): SyncCode {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = crypto.getRandomValues(new Uint8Array(16)); // 128 bits of entropy

  // Encode as base36 with dashes for readability
  const combined = new Uint8Array(salt.length + keyMaterial.length);
  combined.set(salt);
  combined.set(keyMaterial, salt.length);

  const code = encodeSyncCode(combined);
  return { code, salt: bytesToBase64(salt) };
}

function encodeSyncCode(bytes: Uint8Array): string {
  // Convert bytes to a big number, then to base36
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = (num << 8n) | BigInt(bytes[i]);
  }
  // 32 bytes = 256 bits, base36 encodes ~5.17 bits/char → need 50 chars
  const base36 = num.toString(36).toUpperCase().padStart(50, "0");
  // Split into 10 groups of 5 chars
  const groups: string[] = [];
  for (let i = 0; i < 50; i += 5) {
    groups.push(base36.slice(i, i + 5));
  }
  return groups.join("-");
}

function decodeSyncCode(code: string): Uint8Array {
  // Remove dashes, convert from base36 to bytes
  const clean = code.replace(/[-\s]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{50}$/.test(clean)) {
    throw new Error("Invalid sync code format");
  }
  // Parse base36 string to BigInt
  let num = 0n;
  for (let i = 0; i < clean.length; i++) {
    const digit = parseInt(clean[i], 36);
    if (isNaN(digit)) throw new Error("Invalid sync code character");
    num = num * 36n + BigInt(digit);
  }
  // Convert big number back to bytes (32 bytes = 16 salt + 16 key material)
  const bytes = new Uint8Array(32);
  let n = num;
  for (let i = bytes.length - 1; i >= 0; i--) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return bytes;
}

/**
 * Extract the salt from a sync code (first 16 bytes of decoded data).
 */
export function extractSaltFromCode(code: string): string {
  const bytes = decodeSyncCode(code);
  return bytesToBase64(bytes.slice(0, SALT_LENGTH));
}

/**
 * Derive an AES-GCM key from a sync code.
 * Uses PBKDF2 with the salt embedded in the code.
 */
async function deriveKey(code: string, salt: string): Promise<CryptoKey> {
  const codeBytes = decodeSyncCode(code);
  // Use the key material portion (bytes 16-32) as PBKDF2 input
  const keyMaterial = codeBytes.slice(16);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial.buffer instanceof ArrayBuffer ? keyMaterial.buffer : new Uint8Array(keyMaterial).buffer,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const saltBytes = base64ToBytes(salt);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer instanceof ArrayBuffer ? saltBytes.buffer : new Uint8Array(saltBytes).buffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Encrypt / Decrypt ──

/**
 * Encrypt a plaintext string using a sync code.
 * Returns an EncryptedPayload with ciphertext, IV, and salt.
 */
export async function encryptData(plaintext: string, code: string): Promise<EncryptedPayload> {
  const salt = extractSaltFromCode(code);
  const key = await deriveKey(code, salt);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer instanceof ArrayBuffer ? iv.buffer : new Uint8Array(iv).buffer },
    key,
    encoded,
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
    salt,
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Decrypt an EncryptedPayload using a sync code.
 * Returns the plaintext string, or throws if decryption fails (wrong key, corrupted data).
 */
export async function decryptData(payload: EncryptedPayload, code: string): Promise<string> {
  const key = await deriveKey(code, payload.salt);

  const ivBytes = base64ToBytes(payload.iv);
  const ctBytes = base64ToBytes(payload.ciphertext);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer instanceof ArrayBuffer ? ivBytes.buffer : new Uint8Array(ivBytes).buffer },
    key,
    ctBytes.buffer instanceof ArrayBuffer ? ctBytes.buffer : new Uint8Array(ctBytes).buffer,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Validate that a sync code is well-formed.
 */
export function isValidSyncCode(code: string): boolean {
  try {
    decodeSyncCode(code);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a raw sync code string into XXXXX-XXXXX-XXXXX-XXXXX-XXXXX format
 * as the user types it.
 */
export function formatSyncCodeInput(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 50);
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += 5) {
    groups.push(clean.slice(i, i + 5));
  }
  return groups.join("-");
}
