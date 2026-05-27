# `@loontail/yggdrasil-client`

[![npm](https://img.shields.io/npm/v/@loontail/yggdrasil-client.svg)](https://www.npmjs.com/package/@loontail/yggdrasil-client)

TypeScript HTTP client for the Yggdrasil server. Wraps every endpoint with
Zod-validated input and output, surfaces a single error class, and bundles
the `authlib-injector.jar` Java agent plus a one-line `-javaagent` argument
builder.

```bash
npm install @loontail/yggdrasil-client @loontail/yggdrasil-core
```

## What it exports

```ts
import {
  // ── Client ─────────────────────────────────────────────────────
  YggdrasilClient,
  type YggdrasilClientOptions,

  // ── authlib-injector ───────────────────────────────────────────
  AUTHLIB_INJECTOR_VERSION,
  AUTHLIB_INJECTOR_VENDOR_DIR_ENV,
  buildAuthlibInjectorJvmArg,
  resolveAuthlibInjectorJarPath,

  // ── Errors ─────────────────────────────────────────────────────
  YggdrasilClientError,
  YggdrasilClientErrorCodes,
  type YggdrasilClientErrorCode,
  type YggdrasilClientErrorContext,
  type YggdrasilClientErrorOptions,
  isYggdrasilClientError,
  isYggdrasilClientErrorCode,

  // ── Re-exports from @loontail/yggdrasil-core ───────────────────
  type AccessToken,
  type ClientToken,
  type GameProfile,
  type GameProfileProperty,
  type PlayerUuid,
  type ServerId,
  type SkinVariant,
  type TexturesLookupResponse,
  type TexturesPayload,
  type YggdrasilMeta,
  type YggdrasilSession,
  type YggdrasilUser,
  SkinVariants,
  TextureKinds,
  decodeTexturesPayloadBase64,
} from '@loontail/yggdrasil-client';
```

## Guides

- [Using YggdrasilClient](../guides/client-usage)
- [authlib-injector](../guides/authlib-injector)
- [Skin & cape upload](../guides/client-skins)
- [Error handling](../guides/client-errors)
- [Tokens & sessions](../guides/tokens) (broader topic — covers server-side too)

## Method surface

| Group | Method | HTTP |
|---|---|---|
| Auth | `authenticate({ username, password, clientToken?, requestUser? })` | `POST /authserver/authenticate` |
| Auth | `refresh({ accessToken, clientToken?, requestUser? })` | `POST /authserver/refresh` |
| Auth | `validate({ accessToken, clientToken? })` | `POST /authserver/validate` |
| Auth | `invalidate({ accessToken, clientToken? })` | `POST /authserver/invalidate` |
| Profile | `profile(uuid, { signed? })` | `GET /sessionserver/session/minecraft/profile/{uuid}` |
| Profile | `bulkProfiles(names)` | `POST /api/profiles/minecraft` |
| Profile | `meta()` | `GET /` |
| Textures | `getTextures(uuid)` | `GET /textures/{uuid}` |
| Textures | `uploadSkin({ accessToken, file, variant? })` | `PUT /textures/skin` |
| Textures | `uploadCape({ accessToken, file })` | `PUT /textures/cape` |
| Textures | `deleteSkin({ accessToken })` | `DELETE /textures/skin` |
| Textures | `deleteCape({ accessToken })` | `DELETE /textures/cape` |

## Constructor

```ts
new YggdrasilClient({
  apiRoot: string,             // required, absolute URL of the Yggdrasil API root
  fetch?: typeof fetch,        // optional override (tests, custom retries)
});
```

No retries, no built-in timeouts, no header hooks — pass an aborting `fetch`
if you need any of that.

## authlib-injector

The package ships the upstream `authlib-injector-<version>.jar` inside its
`vendor/` folder. Two helpers wrap it:

```ts
import {
  resolveAuthlibInjectorJarPath,
  buildAuthlibInjectorJvmArg,
  AUTHLIB_INJECTOR_VERSION,
} from '@loontail/yggdrasil-client';

const jarPath = resolveAuthlibInjectorJarPath();
const arg = buildAuthlibInjectorJvmArg({
  jarPath,
  apiRoot: 'https://auth.example.com/api/yggdrasil',
});
// → '-javaagent:/.../authlib-injector-1.2.5.jar=https://auth.example.com/api/yggdrasil'

console.log(AUTHLIB_INJECTOR_VERSION); // '1.2.5'
```

For Electron / packaged-app setups, see
[authlib-injector → Electron packaging](../guides/authlib-injector#electron-packaging).

## Engine

- Node ≥ 20, modern browser (where `fetch` and `FormData` are available),
  Electron.
- ESM + CommonJS dual build.
- Dependencies: `@loontail/yggdrasil-core` and `zod` only.
- Tree-shakeable.

## Errors

Every operational failure surfaces as `YggdrasilClientError`. Codes:

- `'network'` — `fetch` rejected (DNS, TCP, abort).
- `'http_error'` — non-2xx response.
- `'invalid_response'` — 2xx but body failed schema validation.
- `'invalid_request'` — client-side invariant violated (e.g. > 10 names to
  `bulkProfiles`).
- `'authlib_injector_missing'` — bundled jar not found.

PNG validation errors raised inside texture uploads bubble up as
`YggdrasilCoreError('invalid_png')` from `@loontail/yggdrasil-core`.

See [Error handling](../guides/client-errors) for a recommended top-level
handler.
