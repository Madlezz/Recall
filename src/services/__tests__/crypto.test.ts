import { describe, it, expect } from "vitest";
import {
  generateSyncCode,
  encryptData,
  decryptData,
  isValidSyncCode,
  formatSyncCodeInput,
  extractSaltFromCode,
  bytesToBase64,
  base64ToBytes,
} from "../crypto";

describe("crypto", () => {
  describe("base64 helpers", () => {
    it("round-trips bytes to base64 and back", () => {
      const original = new Uint8Array([0, 1, 2, 255, 128, 64]);
      const b64 = bytesToBase64(original);
      const decoded = base64ToBytes(b64);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it("handles empty bytes", () => {
      const b64 = bytesToBase64(new Uint8Array(0));
      expect(b64).toBe("");
      const decoded = base64ToBytes(b64);
      expect(decoded.length).toBe(0);
    });
  });

  describe("generateSyncCode", () => {
    it("generates a code in the correct format", () => {
      const { code, salt } = generateSyncCode();
      // Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (50 chars + 9 dashes)
      expect(code).toMatch(/^[A-Z0-9]{5}(-[A-Z0-9]{5}){9}$/);
      expect(salt).toBeTruthy();
      // Salt should be valid base64
      expect(() => atob(salt)).not.toThrow();
    });

    it("generates unique codes each time", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateSyncCode().code);
      }
      expect(codes.size).toBe(100);
    });
  });

  describe("isValidSyncCode", () => {
    it("validates a correct sync code", () => {
      const { code } = generateSyncCode();
      expect(isValidSyncCode(code)).toBe(true);
    });

    it("rejects an invalid code", () => {
      expect(isValidSyncCode("INVALID")).toBe(false);
      expect(isValidSyncCode("AAAAA-BBBBB-CCCCC-DDDDD-EEEE")).toBe(false); // too short (25 chars)
      expect(isValidSyncCode("")).toBe(false);
    });
  });

  describe("extractSaltFromCode", () => {
    it("extracts the same salt that was generated", () => {
      const { code, salt } = generateSyncCode();
      const extracted = extractSaltFromCode(code);
      expect(extracted).toBe(salt);
    });
  });

  describe("formatSyncCodeInput", () => {
    it("formats lowercase to uppercase with dashes", () => {
      const result = formatSyncCodeInput("abcde12345");
      expect(result).toBe("ABCDE-12345");
    });

    it("removes non-alphanumeric characters", () => {
      const result = formatSyncCodeInput("ab-cd!e1 2@3#4$5");
      expect(result).toBe("ABCDE-12345");
    });

    it("truncates to 50 characters", () => {
      const result = formatSyncCodeInput("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
      expect(result).toMatch(/^[A-Z0-9]{5}(-[A-Z0-9]{5}){9}$/);
    });

    it("handles partial input gracefully", () => {
      expect(formatSyncCodeInput("ab")).toBe("AB");
      expect(formatSyncCodeInput("abcde")).toBe("ABCDE");
      expect(formatSyncCodeInput("abcdef")).toBe("ABCDE-F");
    });
  });

  describe("encryptData / decryptData", () => {
    it("round-trips a plaintext string", async () => {
      const { code } = generateSyncCode();
      const plaintext = '{"decks":[],"cards":[],"settings":{"theme":"dark"}}';
      const encrypted = await encryptData(plaintext, code);

      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.iterations).toBe(600000);

      const decrypted = await decryptData(encrypted, code);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertexts for the same plaintext (random IV)", async () => {
      const { code } = generateSyncCode();
      const plaintext = "test data";
      const enc1 = await encryptData(plaintext, code);
      const enc2 = await encryptData(plaintext, code);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      expect(enc1.iv).not.toBe(enc2.iv);
      // Salt should be the same (derived from code)
      expect(enc1.salt).toBe(enc2.salt);
    });

    it("fails to decrypt with the wrong sync code", async () => {
      const code1 = generateSyncCode().code;
      const code2 = generateSyncCode().code;
      const plaintext = "secret data";
      const encrypted = await encryptData(plaintext, code1);

      await expect(decryptData(encrypted, code2)).rejects.toThrow();
    });

    it("handles large payloads", async () => {
      const { code } = generateSyncCode();
      // Simulate a large state payload
      const plaintext = JSON.stringify({
        decks: Array.from({ length: 100 }, (_, i) => ({ id: `d${i}`, name: `Deck ${i}` })),
        cards: Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}`, front: `Q${i}`, back: `A${i}` })),
      });
      const encrypted = await encryptData(plaintext, code);
      const decrypted = await decryptData(encrypted, code);
      expect(decrypted).toBe(plaintext);
    });

    it("handles unicode content", async () => {
      const { code } = generateSyncCode();
      const plaintext = '{"front":"Selamat datang! 🎉 你好 world"}';
      const encrypted = await encryptData(plaintext, code);
      const decrypted = await decryptData(encrypted, code);
      expect(decrypted).toBe(plaintext);
    });
  });
});
