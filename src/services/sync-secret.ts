/**
 * Device-local protection for syncCode at rest.
 *
 * syncCode is E2E key material. This module wraps it with a random AES-GCM
 * device key before it hits SQLite / localStorage, and unwraps on load.
 *
 * In-memory / Zustand still see plaintext so crypto + UI keep working.
 *
 * Storage format: `enc:v1:` + base64(JSON({ ciphertext, iv }))
 * Plaintext values (pre-migration) pass through decryptSyncCode unchanged.
 *
 * Device key lives in IndexedDB when available, else localStorage fallback
 * (happy-dom / restricted webviews). Not OS keychain — that is a later step.
 */

import { base64ToBytes, bytesToBase64 } from "./crypto";

const WRAP_PREFIX = "enc:v1:";
const DEVICE_KEY_STORAGE = "recall_device_wrapping_key";
const IDB_NAME = "recall-secrets";
const IDB_STORE = "keys";
const IDB_KEY = "wrapping";

export function isWrappedSyncCode(value: string): boolean {
  return value.startsWith(WRAP_PREFIX);
}

/** Encrypt plaintext sync code for persistence. Idempotent if already wrapped. */
export async function encryptSyncCode(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  if (isWrappedSyncCode(plaintext)) return plaintext;

  const key = await getOrCreateDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    encoded,
  );
  const payload = {
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
    iv: bytesToBase64(iv),
  };
  // btoa of JSON is fine — payload is base64 fields only
  return WRAP_PREFIX + btoa(JSON.stringify(payload));
}

/**
 * Decrypt a stored sync code.
 * Plaintext (legacy) values returned as-is.
 * Corrupt wrapped blobs → null (caller treats as unpaired).
 */
export async function decryptSyncCode(stored: string | null): Promise<string | null> {
  if (!stored) return null;
  if (!isWrappedSyncCode(stored)) return stored;

  try {
    const raw = stored.slice(WRAP_PREFIX.length);
    const payload = JSON.parse(atob(raw)) as { ciphertext?: string; iv?: string };
    if (!payload.ciphertext || !payload.iv) return null;

    const key = await getOrCreateDeviceKey();
    const ivBytes = base64ToBytes(payload.iv);
    const ctBytes = base64ToBytes(payload.ciphertext);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asArrayBuffer(ivBytes) },
      key,
      asArrayBuffer(ctBytes),
    );
    return new TextDecoder().decode(plainBuf);
  } catch (error) {
    console.error("Failed to decrypt syncCode at rest:", error);
    return null;
  }
}

export async function sealSettingsSecrets<T extends { syncCode: string | null }>(
  settings: T,
): Promise<T> {
  if (!settings.syncCode) return settings;
  const wrapped = await encryptSyncCode(settings.syncCode);
  return { ...settings, syncCode: wrapped };
}

export async function unsealSettingsSecrets<T extends { syncCode: string | null }>(
  settings: T,
): Promise<T> {
  if (!settings.syncCode) return settings;
  const plain = await decryptSyncCode(settings.syncCode);
  return { ...settings, syncCode: plain };
}

// ── Device key ──

/** WebCrypto BufferSource typing: force a real ArrayBuffer view. */
function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : new Uint8Array(bytes).buffer;
}

async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  const raw = await loadDeviceKeyBytes();
  if (raw) {
    return crypto.subtle.importKey("raw", asArrayBuffer(raw), { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const exported = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  await storeDeviceKeyBytes(exported);
  // re-import non-extractable for use
  return crypto.subtle.importKey("raw", asArrayBuffer(exported), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function loadDeviceKeyBytes(): Promise<Uint8Array | null> {
  const fromIdb = await idbGet();
  if (fromIdb) return fromIdb;

  if (typeof localStorage !== "undefined") {
    const b64 = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (b64) {
      try {
        return base64ToBytes(b64);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function storeDeviceKeyBytes(bytes: Uint8Array): Promise<void> {
  const b64 = bytesToBase64(bytes);
  await idbSet(b64);
  if (typeof localStorage !== "undefined") {
    // Mirror so Tauri/webview without IDB still works; same origin only.
    localStorage.setItem(DEVICE_KEY_STORAGE, b64);
  }
}

function idbGet(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(IDB_STORE, "readonly");
          const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY);
          getReq.onsuccess = () => {
            const val = getReq.result;
            db.close();
            if (typeof val === "string") {
              try {
                resolve(base64ToBytes(val));
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          };
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

function idbSet(b64: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onerror = () => resolve();
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).put(b64, IDB_KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
    } catch {
      resolve();
    }
  });
}
