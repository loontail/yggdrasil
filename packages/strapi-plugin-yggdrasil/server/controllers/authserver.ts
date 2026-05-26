import {
  AuthenticateRequestSchema,
  InvalidateRequestSchema,
  RefreshRequestSchema,
  ValidateRequestSchema,
  type YggdrasilSession,
} from '@loontail/yggdrasil-core';
import type { PasswordsService } from '../services/passwords';
import type { TokensService } from '../services/tokens';
import type { UsersService, YggdrasilUserRow } from '../services/users';
import type { KoaContext, StrapiInstance } from '../types';
import { YggdrasilHttpError, parseOrThrow, pluginService } from './helpers';

const HTTP_FORBIDDEN = 403;
const HTTP_NO_CONTENT = 204;

const ensureNotBlocked = <T extends Pick<YggdrasilUserRow, 'blocked'>>(user: T | null): T => {
  if (!user || user.blocked) {
    throw new YggdrasilHttpError(
      HTTP_FORBIDDEN,
      'ForbiddenOperationException',
      'Invalid credentials. Invalid username or password.',
    );
  }
  return user;
};

const sessionFor = (
  user: YggdrasilUserRow,
  accessToken: string,
  clientToken: string,
): YggdrasilSession => {
  const profile = { id: user.uuid as string, name: user.username };
  return {
    accessToken,
    clientToken,
    availableProfiles: [profile],
    selectedProfile: profile,
  };
};

export default ({ strapi }: { strapi: StrapiInstance }) => ({
  async authenticate(ctx: KoaContext) {
    const body = parseOrThrow(ctx, AuthenticateRequestSchema, ctx.request.body);
    const users = pluginService<UsersService>(strapi, 'users');
    const passwords = pluginService<PasswordsService>(strapi, 'passwords');
    const tokens = pluginService<TokensService>(strapi, 'tokens');

    const found = ensureNotBlocked(await users.findByIdentifierWithPassword(body.username));
    const passwordOk = await passwords.validate(body.password, found.password);
    if (!passwordOk) {
      throw new YggdrasilHttpError(
        HTTP_FORBIDDEN,
        'ForbiddenOperationException',
        'Invalid credentials. Invalid username or password.',
      );
    }

    const uuid = await users.ensureUuid(found.id);
    const issued = await tokens.issue(found.id, body.clientToken);
    ctx.body = sessionFor({ ...found, uuid }, issued.accessToken, issued.clientToken);
  },

  async refresh(ctx: KoaContext) {
    const body = parseOrThrow(ctx, RefreshRequestSchema, ctx.request.body);
    const tokens = pluginService<TokensService>(strapi, 'tokens');
    const users = pluginService<UsersService>(strapi, 'users');

    const rotated = await tokens.refresh(body.accessToken, body.clientToken);
    if (!rotated) {
      throw new YggdrasilHttpError(HTTP_FORBIDDEN, 'ForbiddenOperationException', 'Invalid token.');
    }
    const validatedUser = await tokens.validate(rotated.accessToken, rotated.clientToken);
    if (!validatedUser) {
      throw new YggdrasilHttpError(HTTP_FORBIDDEN, 'ForbiddenOperationException', 'Invalid token.');
    }
    const found = ensureNotBlocked(await users.findById(validatedUser.userId));
    if (!found.uuid) {
      throw new YggdrasilHttpError(
        HTTP_FORBIDDEN,
        'ForbiddenOperationException',
        'Profile not initialized.',
      );
    }
    ctx.body = sessionFor(found, rotated.accessToken, rotated.clientToken);
  },

  async validate(ctx: KoaContext) {
    const body = parseOrThrow(ctx, ValidateRequestSchema, ctx.request.body);
    const tokens = pluginService<TokensService>(strapi, 'tokens');
    const validated = await tokens.validate(body.accessToken, body.clientToken);
    if (!validated) {
      throw new YggdrasilHttpError(HTTP_FORBIDDEN, 'ForbiddenOperationException', 'Invalid token.');
    }
    ctx.status = HTTP_NO_CONTENT;
    ctx.body = null;
  },

  async invalidate(ctx: KoaContext) {
    const body = parseOrThrow(ctx, InvalidateRequestSchema, ctx.request.body);
    const tokens = pluginService<TokensService>(strapi, 'tokens');
    await tokens.invalidate(body.accessToken, body.clientToken);
    ctx.status = HTTP_NO_CONTENT;
    ctx.body = null;
  },
});
