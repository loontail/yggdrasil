import { createPublicKey, createVerify } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StrapiInstance } from '../types';
import { createCryptoService } from './crypto';

const buildStrapi = (
  root: string,
  privateKeyPath = 'data/yggdrasil/keys/active.key.pem',
): StrapiInstance => {
  const cfg = {
    publicUrl: 'https://example.test/api/yggdrasil',
    skinDomains: [],
    serverName: 'Test',
    implementationName: 'test',
    implementationVersion: '0',
    tokens: { accessTtlSeconds: 60, maxPerUser: 5 },
    privateKeyPath,
    joinBackend: 'memory' as const,
  };
  return {
    log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    dirs: { app: { root, src: root } },
    config: { get: (key: string) => (key === 'plugin::yggdrasil' ? cfg : undefined) },
    db: {
      connection: (() => ({})) as unknown as StrapiInstance['db']['connection'],
      query: () => ({
        findOne: async () => null,
        findMany: async () => [],
        create: async () => null,
        update: async () => null,
        delete: async () => null,
        count: async () => 0,
      }),
    },
    plugin: () => ({
      service: () => ({}),
      config: (key?: string) => {
        if (!key) return cfg;
        return (cfg as unknown as Record<string, unknown>)[key];
      },
    }),
  };
};

describe('cryptoService', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'yggdrasil-crypto-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('generates a 4096-bit key pair on first init and reuses it on second init', async () => {
    const s1 = createCryptoService({ strapi: buildStrapi(root) });
    await s1.init();
    const pub1 = s1.publicKeyPem();

    const s2 = createCryptoService({ strapi: buildStrapi(root) });
    await s2.init();
    expect(s2.publicKeyPem()).toBe(pub1);
  });

  it('signs with SHA1withRSA / PKCS#1 producing a base64 signature verifiable by the public key', async () => {
    const s = createCryptoService({ strapi: buildStrapi(root) });
    await s.init();
    const message = 'hello yggdrasil';
    const signatureB64 = s.signBase64(message);
    expect(signatureB64).toMatch(/^[A-Za-z0-9+/=]+$/);

    const publicKey = createPublicKey(s.publicKeyPem());
    const verifier = createVerify('RSA-SHA1');
    verifier.update(message);
    expect(verifier.verify(publicKey, Buffer.from(signatureB64, 'base64'))).toBe(true);
  });
});
