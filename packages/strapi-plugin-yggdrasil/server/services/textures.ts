import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { detectMojangSkinVariant } from '@loontail/minecraft-kit';
import {
  type GameProfileProperty,
  type SkinVariant,
  SkinVariants,
  buildTexturesPayload,
  encodeTexturesPayloadBase64,
} from '@loontail/yggdrasil-core';
import { readConfig } from '../config';
import type { StrapiInstance } from '../types';
import type { CryptoService } from './crypto';
import type { YggdrasilUserRow } from './users';

const TEXTURES_PROPERTY_NAME = 'textures';

const isHttpUrl = (value: string): boolean =>
  value.startsWith('http://') || value.startsWith('https://');

/**
 * Convert a stored skin/cape URL into an absolute disk path under the
 * Strapi `public/` tree. Accepts either a root-relative path
 * (`/skins-registry/...`) or an absolute URL whose pathname starts at
 * that same root — the launcher persists the full media URL, but the
 * file always lives under `public/`, so only the pathname matters.
 *
 * Guarded against path traversal: any candidate that resolves outside
 * `public/` (e.g. `/../../etc/passwd`) returns `null` instead of a
 * usable path. Without this guard a malicious or buggy skin field
 * could let `readFile` peek at arbitrary files under the Strapi
 * process's UID.
 */
const toDiskPath = (strapi: StrapiInstance, storedUrl: string): string | null => {
  const publicDir = strapi.dirs.static?.public;
  if (!publicDir) return null;
  let pathname: string;
  if (isHttpUrl(storedUrl)) {
    try {
      pathname = new URL(storedUrl).pathname;
    } catch {
      return null;
    }
  } else if (storedUrl.startsWith('/')) {
    pathname = storedUrl;
  } else {
    return null;
  }
  const resolvedPublic = path.resolve(publicDir);
  const candidate = path.resolve(resolvedPublic, pathname.replace(/^\/+/, ''));
  // `path.resolve` already collapses `..` segments, so we just need to
  // confirm the result is still inside `public/`.
  if (candidate !== resolvedPublic && !candidate.startsWith(`${resolvedPublic}${path.sep}`)) {
    return null;
  }
  return candidate;
};

/**
 * Build the absolute URL we hand back to clients. Constructed from the
 * configured `publicUrl`'s origin + the relative path. This guarantees
 * the host matches an entry in `skinDomains`.
 */
const toPublicUrl = (strapi: StrapiInstance, relUrl: string): string => {
  if (isHttpUrl(relUrl)) return relUrl;
  const cfg = readConfig(strapi);
  const origin = new URL(cfg.publicUrl).origin;
  return `${origin}${relUrl.startsWith('/') ? relUrl : `/${relUrl}`}`;
};

/**
 * `detectMojangSkinVariant` is documented to return either `'CLASSIC'`
 * or `'SLIM'`, but historically minecraft-kit has returned lowercase
 * values too. Normalise to the {@link SkinVariants} enum here so the
 * rest of the plugin doesn't have to defend against either casing.
 */
const normaliseDetectedVariant = (raw: string): SkinVariant =>
  raw.toUpperCase() === SkinVariants.SLIM ? SkinVariants.SLIM : SkinVariants.CLASSIC;

const detectVariantSafely = async (
  strapi: StrapiInstance,
  relUrl: string,
): Promise<SkinVariant> => {
  const diskPath = toDiskPath(strapi, relUrl);
  if (!diskPath) return SkinVariants.CLASSIC;
  try {
    const buf = await readFile(diskPath);
    return normaliseDetectedVariant(detectMojangSkinVariant(buf));
  } catch (err) {
    strapi.log.warn(
      `[yggdrasil] Could not read skin file for variant detection at ${diskPath}: ${
        (err as Error).message
      }`,
    );
    return SkinVariants.CLASSIC;
  }
};

export type TexturesService = ReturnType<typeof createTexturesService>;

export type BuildOptions = {
  /** When false, the property is returned without `signature`. */
  readonly signed?: boolean;
};

export const createTexturesService = ({
  strapi,
  crypto,
}: {
  strapi: StrapiInstance;
  crypto: CryptoService;
}) => ({
  /**
   * Build the `textures` profile property for `user`. Returns `null`
   * when the user has neither a skin nor a cape (so the caller can
   * omit `properties` entirely).
   */
  async buildTexturesProperty(
    user: YggdrasilUserRow,
    options: BuildOptions = {},
  ): Promise<GameProfileProperty | null> {
    if (!user.uuid) return null;
    if (!user.skin && !user.cape) return null;

    const skin = user.skin
      ? {
          url: toPublicUrl(strapi, user.skin),
          variant: await detectVariantSafely(strapi, user.skin),
        }
      : undefined;
    const cape = user.cape ? { url: toPublicUrl(strapi, user.cape) } : undefined;

    const payload = buildTexturesPayload({
      profileId: user.uuid,
      profileName: user.username,
      ...(skin ? { skin } : {}),
      ...(cape ? { cape } : {}),
    });
    const value = encodeTexturesPayloadBase64(payload);
    const property: GameProfileProperty = {
      name: TEXTURES_PROPERTY_NAME,
      value,
      ...(options.signed === false ? {} : { signature: crypto.signBase64(value) }),
    };
    return property;
  },
});
