import {
  type GameProfile,
  GameProfileSchema,
  YggdrasilEndpoints,
  type YggdrasilMeta,
  YggdrasilMetaSchema,
  type YggdrasilSession,
  YggdrasilSessionSchema,
  undashUuid,
} from '@loontail/yggdrasil-core';
import { z } from 'zod';
import {
  YggdrasilClientError,
  YggdrasilClientErrorCodes,
  isYggdrasilClientErrorCode,
} from './errors/yggdrasil-client-error.js';
import { type Fetcher, getJson, postJson } from './http.js';

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
 * HTTP client for a Yggdrasil-compatible authentication server.
 *
 * The client is read-only with respect to skins/capes — texture
 * uploads and deletions live outside the Yggdrasil protocol (in this
 * stack, in the `skins-registry` plugin). The methods exposed here
 * cover authentication, session tokens, profile lookups, and the
 * root metadata endpoint.
 *
 * @example
 * ```ts
 * const client = new YggdrasilClient({ apiRoot: 'https://my/api/yggdrasil' });
 * const session = await client.authenticate({ username: 'a@b', password: 'p' });
 * await client.validate({ accessToken: session.accessToken, clientToken: session.clientToken });
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

  private url(endpoint: string): string {
    return `${this.apiRoot}${endpoint}`;
  }
}
