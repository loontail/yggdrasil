import {
  type GameProfile,
  HasJoinedQuerySchema,
  JoinRequestSchema,
  ProfileLookupParamSchema,
  ProfileLookupQuerySchema,
  undashUuid,
} from '@loontail/yggdrasil-core';
import type { JoinSessionsService } from '../services/join-sessions';
import type { TexturesService } from '../services/textures';
import type { TokensService } from '../services/tokens';
import type { UsersService, YggdrasilUserRow } from '../services/users';
import type { KoaContext, StrapiInstance } from '../types';
import { YggdrasilHttpError, parseOrThrow, pluginService } from './helpers';

const HTTP_NO_CONTENT = 204;
const HTTP_FORBIDDEN = 403;

const buildProfile = async (
  strapi: StrapiInstance,
  user: YggdrasilUserRow,
  signed: boolean,
): Promise<GameProfile> => {
  if (!user.uuid) {
    throw new YggdrasilHttpError(
      HTTP_FORBIDDEN,
      'ForbiddenOperationException',
      'Profile has no UUID.',
    );
  }
  const textures = pluginService<TexturesService>(strapi, 'textures');
  const property = await textures.buildTexturesProperty(user, { signed });
  return {
    id: user.uuid,
    name: user.username,
    ...(property ? { properties: [property] } : {}),
  };
};

export default ({ strapi }: { strapi: StrapiInstance }) => ({
  async join(ctx: KoaContext) {
    const body = parseOrThrow(ctx, JoinRequestSchema, ctx.request.body);
    const tokens = pluginService<TokensService>(strapi, 'tokens');
    const users = pluginService<UsersService>(strapi, 'users');
    const joinSessions = pluginService<JoinSessionsService>(strapi, 'join-sessions');

    const token = await tokens.validate(body.accessToken);
    if (!token) {
      throw new YggdrasilHttpError(HTTP_FORBIDDEN, 'ForbiddenOperationException', 'Invalid token.');
    }
    const owner = await users.findById(token.userId);
    // Compare UUIDs case-insensitively. Newly-issued ids are always
    // lowercase (see `randomUndashedUuid`) but legacy or hand-seeded rows
    // may not be, and `selectedProfile` is normalised on the client too.
    if (!owner || !owner.uuid || owner.uuid.toLowerCase() !== body.selectedProfile.toLowerCase()) {
      throw new YggdrasilHttpError(
        HTTP_FORBIDDEN,
        'ForbiddenOperationException',
        'Profile does not match access token.',
      );
    }
    const ip = ctx.request.ip;
    await joinSessions.put(body.serverId, ip ? { userId: owner.id, ip } : { userId: owner.id });
    ctx.status = HTTP_NO_CONTENT;
    ctx.body = null;
  },

  async hasJoined(ctx: KoaContext) {
    const query = parseOrThrow(ctx, HasJoinedQuerySchema, ctx.request.query);
    const users = pluginService<UsersService>(strapi, 'users');
    const joinSessions = pluginService<JoinSessionsService>(strapi, 'join-sessions');

    const entry = await joinSessions.take(query.serverId);
    if (!entry) {
      ctx.status = HTTP_NO_CONTENT;
      ctx.body = null;
      return;
    }
    if (query.ip && entry.ip && entry.ip !== query.ip) {
      ctx.status = HTTP_NO_CONTENT;
      ctx.body = null;
      return;
    }
    const user = await users.findById(entry.userId);
    if (!user || user.blocked || user.username.toLowerCase() !== query.username.toLowerCase()) {
      ctx.status = HTTP_NO_CONTENT;
      ctx.body = null;
      return;
    }
    ctx.body = await buildProfile(strapi, user, true);
  },

  async profile(ctx: KoaContext) {
    const params = parseOrThrow(ctx, ProfileLookupParamSchema, ctx.params);
    const query = parseOrThrow(ctx, ProfileLookupQuerySchema, ctx.request.query);
    const users = pluginService<UsersService>(strapi, 'users');
    const found = await users.findByUuid(undashUuid(params.uuid));
    if (!found || found.blocked) {
      ctx.status = HTTP_NO_CONTENT;
      ctx.body = null;
      return;
    }
    // The spec is ambiguous about the default, but Mojang's vanilla client
    // calls this endpoint without `?unsigned` and refuses unsigned payloads
    // (`Signature is missing from textures payload`). Default to signed; the
    // explicit `?unsigned=true` opt-out skips the RSA sign for callers that
    // genuinely don't need it.
    const signed = query.unsigned !== true;
    ctx.body = await buildProfile(strapi, found, signed);
  },
});
