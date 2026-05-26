import {
  type KeyObject,
  createPrivateKey,
  createPublicKey,
  createSign,
  generateKeyPairSync,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readConfig } from '../config';
import type { StrapiInstance } from '../types';

const PUBLIC_FILE_NAME = 'active.pub.pem';
const PUBLIC_ARCHIVE_DIR = 'archive';

type KeyState = {
  privatePem: string;
  privateKey: KeyObject;
  publicPem: string;
  archivedPublicPems: readonly string[];
};

type Strapi = StrapiInstance;

export type CryptoService = ReturnType<typeof createCryptoService>;

export const createCryptoService = ({ strapi }: { strapi: Strapi }) => {
  let state: KeyState | null = null;

  const privateKeyPath = (): string => {
    const cfg = readConfig(strapi);
    return path.isAbsolute(cfg.privateKeyPath)
      ? cfg.privateKeyPath
      : path.join(strapi.dirs.app.root, cfg.privateKeyPath);
  };

  const publicKeyPath = (): string => path.join(path.dirname(privateKeyPath()), PUBLIC_FILE_NAME);

  const archiveDir = (): string => path.join(path.dirname(privateKeyPath()), PUBLIC_ARCHIVE_DIR);

  const loadArchived = (): readonly string[] => {
    const dir = archiveDir();
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith('.pub.pem'))
      .map((name) => readFileSync(path.join(dir, name), 'utf8'));
  };

  const generate = (): KeyState => {
    const keys = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const privatePem = keys.privateKey;
    const publicPem = keys.publicKey;
    const privateKey = createPrivateKey(privatePem);

    const target = privateKeyPath();
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, privatePem, { encoding: 'utf8', flag: 'w' });
    writeFileSync(publicKeyPath(), publicPem, { encoding: 'utf8', flag: 'w' });
    return {
      privatePem,
      privateKey,
      publicPem,
      archivedPublicPems: loadArchived(),
    };
  };

  const load = (): KeyState => {
    const target = privateKeyPath();
    if (!existsSync(target)) return generate();
    const privatePem = readFileSync(target, 'utf8');
    const privateKey = createPrivateKey(privatePem);
    let publicPem: string;
    if (existsSync(publicKeyPath())) {
      publicPem = readFileSync(publicKeyPath(), 'utf8');
    } else {
      // Recover public from private if the side-file is missing.
      publicPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) as string;
      writeFileSync(publicKeyPath(), publicPem, { encoding: 'utf8' });
    }
    return {
      privatePem,
      privateKey,
      publicPem,
      archivedPublicPems: loadArchived(),
    };
  };

  const ensure = (): KeyState => {
    if (!state) state = load();
    return state;
  };

  return {
    /** Pre-warm / generate-if-missing. Call from bootstrap. */
    async init(): Promise<void> {
      ensure();
    },

    /** PEM of the currently-active public key. */
    publicKeyPem(): string {
      return ensure().publicPem;
    },

    /** All public keys we'd accept (active + archive), for `signaturePublickeys[]`. */
    allPublicKeyPems(): readonly string[] {
      const s = ensure();
      return [s.publicPem, ...s.archivedPublicPems];
    },

    /**
     * Sign a string with SHA1withRSA / PKCS#1 v1.5 (Yggdrasil spec).
     * Returns the base64 signature ready to drop into
     * `properties[0].signature`.
     */
    signBase64(payload: string): string {
      const signer = createSign('RSA-SHA1');
      signer.update(payload);
      return signer.sign(ensure().privateKey).toString('base64');
    },
  };
};
