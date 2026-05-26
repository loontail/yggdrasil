import {
  type GameProfile,
  GameProfileSchema,
  type SkinVariant,
  SkinVariants,
  type TexturesLookupResponse,
  TexturesLookupResponseSchema,
  YggdrasilEndpoints,
  type YggdrasilMeta,
  YggdrasilMetaSchema,
  type YggdrasilSession,
  YggdrasilSessionSchema,
  assertPngBuffer,
  undashUuid,
} from '@loontail/yggdrasil-core';
import { z } from 'zod';
import {
  YggdrasilClientError,
  YggdrasilClientErrorCodes,
  isYggdrasilClientErrorCode,
} from './errors/yggdrasil-client-error.js';
import { type Fetcher, deleteWithAuth, getJson, postJson, putMultipart } from './http.js';

export type YggdrasilClientOptions = {
  /** The Yggdrasil API root, e.g. `https://my.example.com/api/yggdrasil`. */
  readonly apiRoot: string;
  /** Optional `fetch` override (useful for tests). */
  readonly fetch?: Fetcher;
};

const AUTH_AGENT = { name: 'Minecraft', version: 1 } as const;

/**
 * Yggdrasil's `POST /api/profiles/minecraft` bulk lookup is capped at
 * 10 names per request by the spec; reject larger inputs client-side
 * so the caller gets a localisable error instead of a 400.
 */
const BULK_PROFILES_MAX = 10;

const GameProfileArraySchema = z.array(GameProfileSchema);

const HTTP_FORBIDDEN = 403;

/**
 * HTTP client for a Yggdrasil-compatible authentication server with
 * Loontail's profile-textures extensions.
 *
 * Covers protocol endpoints (authenticate, refresh, validate,
 * invalidate, profile lookups, root metadata) plus the
 * Loontail-specific texture management routes (`PUT/DELETE
 * /textures/skin|cape`, `GET /textures/:uuid`) that replaced the
 * standalone `skins-registry` Strapi plugin.
 *
 * @example
 * ```ts
 * const client = new YggdrasilClient({ apiRoot: 'https://my/api/yggdrasil' });
 * const session = await client.authenticate({ username: 'a@b', password: 'p' });
 * await client.uploadSkin({ accessToken: session.accessToken, file: pngBuffer, variant: 'CLASSIC' });
 * ```
 */
export class YggdrasilClient {
  private readonly apiRoot: string;
  private readonly fetcher: Fetcher;

  constructor(options: YggdrasilClientOptions) {
    this.apiRoot = options.apiRoot.replace(/\/$/, '');
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Exchange username/password for fresh `accessToken` + `clientToken`. */
  async authenticate(input: {
    username: string;
    password: string;
    clientToken?: string;
    requestUser?: boolean;
  }): Promise<YggdrasilSession> {
    return postJson({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.authenticate),
      body: {
        username: input.username,
        password: input.password,
        ...(input.clientToken ? { clientToken: input.clientToken } : {}),
        ...(input.requestUser ? { requestUser: input.requestUser } : {}),
        agent: AUTH_AGENT,
      },
      responseSchema: YggdrasilSessionSchema,
    });
  }

  /** Rotate `accessToken`. The previous one is invalidated server-side. */
  async refresh(input: {
    accessToken: string;
    clientToken?: string;
    requestUser?: boolean;
  }): Promise<YggdrasilSession> {
    return postJson({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.refresh),
      body: {
        accessToken: input.accessToken,
        ...(input.clientToken ? { clientToken: input.clientToken } : {}),
        ...(input.requestUser ? { requestUser: input.requestUser } : {}),
      },
      responseSchema: YggdrasilSessionSchema,
    });
  }

  /**
   * Return `true` if the server accepts the access token (HTTP 204),
   * `false` if it rejects it (HTTP 403). Network and other failures
   * throw {@link YggdrasilClientError}.
   */
  async validate(input: { accessToken: string; clientToken?: string }): Promise<boolean> {
    try {
      await postJson({
        fetcher: this.fetcher,
        url: this.url(YggdrasilEndpoints.validate),
        body: {
          accessToken: input.accessToken,
          ...(input.clientToken ? { clientToken: input.clientToken } : {}),
        },
        responseSchema: null,
      });
      return true;
    } catch (err) {
      // 403 is the spec-defined "token is no longer valid" response — not
      // an error condition for our caller.
      if (
        isYggdrasilClientErrorCode(err, YggdrasilClientErrorCodes.HTTP_ERROR) &&
        err.context?.status === HTTP_FORBIDDEN
      ) {
        return false;
      }
      throw err;
    }
  }

  /** Tell the server to drop the supplied access token. Best-effort. */
  async invalidate(input: { accessToken: string; clientToken?: string }): Promise<void> {
    await postJson({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.invalidate),
      body: {
        accessToken: input.accessToken,
        ...(input.clientToken ? { clientToken: input.clientToken } : {}),
      },
      responseSchema: null,
    });
  }

  /**
   * Fetch a player's profile by UUID. Pass `signed: true` to include
   * the signed `textures` property (server-side configuration may
   * decide to always include it).
   */
  async profile(uuid: string, opts?: { signed?: boolean }): Promise<GameProfile> {
    const undashed = undashUuid(uuid);
    const query = opts?.signed ? '?unsigned=false' : '';
    return getJson({
      fetcher: this.fetcher,
      url: `${this.url(YggdrasilEndpoints.sessionProfile)}/${undashed}${query}`,
      responseSchema: GameProfileSchema,
    });
  }

  /** Resolve up to 10 usernames into `{ id, name }` profiles. */
  async bulkProfiles(names: readonly string[]): Promise<GameProfile[]> {
    if (names.length > BULK_PROFILES_MAX) {
      throw new YggdrasilClientError(
        YggdrasilClientErrorCodes.INVALID_REQUEST,
        `bulkProfiles accepts at most ${BULK_PROFILES_MAX} names per request (got ${names.length})`,
        { context: { url: this.url(YggdrasilEndpoints.bulkProfiles) } },
      );
    }
    return postJson({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.bulkProfiles),
      body: names,
      responseSchema: GameProfileArraySchema,
    });
  }

  /** Root ALI metadata. authlib-injector queries this once at JVM start. */
  async meta(): Promise<YggdrasilMeta> {
    return getJson({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.root),
      responseSchema: YggdrasilMetaSchema,
    });
  }

  /**
   * Fetch the public skin/cape URLs for `uuid`. Returns `null`
   * entries when the player has not uploaded the corresponding
   * asset. This is the convenience endpoint — Yggdrasil-compliant
   * clients should usually go through {@link profile} and decode the
   * textures property instead.
   */
  async getTextures(uuid: string): Promise<TexturesLookupResponse> {
    const undashed = undashUuid(uuid);
    return getJson({
      fetcher: this.fetcher,
      url: `${this.url(YggdrasilEndpoints.textures)}/${undashed}`,
      responseSchema: TexturesLookupResponseSchema,
    });
  }

  /**
   * Upload (or replace) the caller's skin. The server identifies the
   * owner from `accessToken`; there is no userId in the URL. The PNG
   * is validated client-side via {@link assertPngBuffer} before the
   * request goes out, so a malformed file fails locally with an
   * actionable {@link YggdrasilCoreError(invalid_png)}.
   */
  async uploadSkin(input: {
    accessToken: string;
    file: Uint8Array | ArrayBuffer;
    variant?: SkinVariant;
  }): Promise<void> {
    assertPngBuffer(input.file, 'skin');
    await putMultipart({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.texturesSkin),
      accessToken: input.accessToken,
      file: input.file,
      fields: { variant: input.variant ?? SkinVariants.CLASSIC },
      responseSchema: null,
    });
  }

  /** Upload (or replace) the caller's cape. See {@link uploadSkin}. */
  async uploadCape(input: {
    accessToken: string;
    file: Uint8Array | ArrayBuffer;
  }): Promise<void> {
    assertPngBuffer(input.file, 'cape');
    await putMultipart({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.texturesCape),
      accessToken: input.accessToken,
      file: input.file,
      responseSchema: null,
    });
  }

  /** Delete the caller's skin. 204 on success or already-empty. */
  async deleteSkin(input: { accessToken: string }): Promise<void> {
    await deleteWithAuth({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.texturesSkin),
      accessToken: input.accessToken,
      responseSchema: null,
    });
  }

  /** Delete the caller's cape. 204 on success or already-empty. */
  async deleteCape(input: { accessToken: string }): Promise<void> {
    await deleteWithAuth({
      fetcher: this.fetcher,
      url: this.url(YggdrasilEndpoints.texturesCape),
      accessToken: input.accessToken,
      responseSchema: null,
    });
  }

  private url(endpoint: string): string {
    return `${this.apiRoot}${endpoint}`;
  }
}
