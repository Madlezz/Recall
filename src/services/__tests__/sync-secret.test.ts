import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptSyncCode,
  encryptSyncCode,
  isWrappedSyncCode,
  sealSettingsSecrets,
  unsealSettingsSecrets,
} from "../sync-secret";

const CODE = "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE-FFFFF-GGGGG-HHHHH-IIIII-JJJJJ";

describe("sync-secret", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("wraps plaintext with enc:v1: prefix", async () => {
    const wrapped = await encryptSyncCode(CODE);
    expect(isWrappedSyncCode(wrapped)).toBe(true);
    expect(wrapped).not.toContain(CODE);
  });

  it("round-trips encrypt then decrypt", async () => {
    const wrapped = await encryptSyncCode(CODE);
    const plain = await decryptSyncCode(wrapped);
    expect(plain).toBe(CODE);
  });

  it("is idempotent when already wrapped", async () => {
    const once = await encryptSyncCode(CODE);
    const twice = await encryptSyncCode(once);
    expect(twice).toBe(once);
  });

  it("passes legacy plaintext through decrypt", async () => {
    await expect(decryptSyncCode(CODE)).resolves.toBe(CODE);
  });

  it("returns null for empty / null", async () => {
    await expect(decryptSyncCode(null)).resolves.toBeNull();
    await expect(decryptSyncCode("")).resolves.toBeNull();
  });

  it("seal/unseal settings leaves other fields alone", async () => {
    const settings = { syncCode: CODE, theme: "dark" as const };
    const sealed = await sealSettingsSecrets(settings);
    expect(isWrappedSyncCode(sealed.syncCode!)).toBe(true);
    expect(sealed.theme).toBe("dark");

    const unsealed = await unsealSettingsSecrets(sealed);
    expect(unsealed.syncCode).toBe(CODE);
    expect(unsealed.theme).toBe("dark");
  });

  it("disk blob does not contain the raw sync code", async () => {
    const sealed = await sealSettingsSecrets({ syncCode: CODE });
    expect(JSON.stringify(sealed)).not.toContain(CODE.replace(/-/g, ""));
    expect(sealed.syncCode).not.toBe(CODE);
  });
});
