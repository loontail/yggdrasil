# Error handling

Every operational failure in `@loontail/yggdrasil-client` surfaces as a
`YggdrasilClientError` with a stable `code` you can branch on. Input shape
errors raised by `@loontail/yggdrasil-core` surface as `YggdrasilCoreError`
with their own code set. Both inherit from `Error`.

## `YggdrasilClientError`

```ts
import {
  YggdrasilClientError,
  isYggdrasilClientError,
  isYggdrasilClientErrorCode,
  YggdrasilClientErrorCodes,
} from '@loontail/yggdrasil-client';

try {
  await client.authenticate({ username, password });
} catch (err) {
  if (isYggdrasilClientErrorCode(err, YggdrasilClientErrorCodes.HTTP_ERROR)) {
    // err.context.status, err.context.body, err.context.url
  } else if (isYggdrasilClientError(err)) {
    // any code
  } else {
    throw err;
  }
}
```

The fields:

```ts
class YggdrasilClientError extends Error {
  readonly code: YggdrasilClientErrorCode;
  readonly context?: Readonly<YggdrasilClientErrorContext>;
  // .cause is the underlying error, when there is one (ES2022 standard).
}

type YggdrasilClientErrorContext = {
  readonly status?: number;
  readonly body?: YggdrasilErrorBody;  // parsed Yggdrasil envelope when shape matches
  readonly url?: string;
  readonly [k: string]: unknown;
};
```

## Codes

### `network`

Thrown when `fetch` itself rejects — DNS lookup failed, TCP could not connect,
TLS handshake refused, request aborted before a response arrived, runtime
out of buffers.

- `context.url` — the URL we tried to reach.
- `cause` — the original `TypeError` from `fetch` (or `AbortError` from an
  aborted signal).

How to handle: bail out and surface "no connection" to the user. Retrying
inside a launcher UI thread is rarely useful — let the user click "try again".

### `http_error`

Thrown for any non-2xx response (with the exception of `validate`, which
treats `403` as a `false` return value).

- `context.status` — the HTTP status code.
- `context.body` — the parsed Yggdrasil error envelope when the response body
  matched `YggdrasilErrorBodySchema`. Otherwise `undefined`.
- `context.url` — the URL we hit.

The envelope (`YggdrasilErrorBody`):

```ts
{
  error:        'ForbiddenOperationException',
  errorMessage: 'Invalid credentials.',
  cause:        'optional, additional context',
}
```

How to handle: branch on `context.status` and/or `context.body.error`:

```ts
if (isYggdrasilClientErrorCode(err, YggdrasilClientErrorCodes.HTTP_ERROR)) {
  const status = err.context?.status;
  const kind = err.context?.body?.error;

  if (status === 403 && kind === 'ForbiddenOperationException') {
    return promptForFreshCredentials();
  }
  if (status === 429) {
    return notifyRateLimited();
  }
  throw err;
}
```

### `invalid_response`

Server returned a 2xx but the body didn't match the Zod schema for that
endpoint. This is a server bug or a version-skew problem (server upgraded
beyond what this client knows about) — not something the user can fix in the
moment.

- `context.url` — the URL we hit.
- `cause` — the underlying `ZodError` with the field paths that failed.

How to handle: log it, report to the user as "server returned unexpected
data", and consider bumping the client to a version that knows the new shape.

### `invalid_request`

Caller violated a documented client-side invariant. The client raises this
*before* the HTTP layer is touched.

Currently raised for:

- `client.bulkProfiles(names)` with `names.length > 10`.
- Texture upload methods with malformed PNGs (the actual throw goes through
  `assertPngBuffer` → `YggdrasilCoreError(invalid_png)`, but it bubbles up
  out of the same call site).

How to handle: fix the input. These reflect mistakes in the calling code.

### `authlib_injector_missing`

`resolveAuthlibInjectorJarPath()` couldn't find the bundled jar in any of the
candidate locations.

- `context.vendorDir` — the directory it searched.
- `context.envOverride` — value of `LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR` if
  set.
- `context.files` — the actual filenames found in that directory.

How to handle: this is a packaging error. Make sure the jar shipped with the
launcher binary (see [authlib-injector](./authlib-injector) for Electron
packaging). The runtime user can't recover.

## `YggdrasilCoreError`

Re-exported from `@loontail/yggdrasil-core`. Used for input shape errors —
invalid UUIDs, malformed PNGs, malformed `BuildTexturesPayloadInput`.

```ts
import {
  YggdrasilCoreError,
  isYggdrasilCoreError,
  isYggdrasilCoreErrorCode,
  YggdrasilCoreErrorCodes,
} from '@loontail/yggdrasil-core';

YggdrasilCoreErrorCodes.INVALID_UUID;            // 'invalid_uuid'
YggdrasilCoreErrorCodes.INVALID_TEXTURES_INPUT;  // 'invalid_textures_input'
YggdrasilCoreErrorCodes.INVALID_PNG;             // 'invalid_png'
```

Shape:

```ts
class YggdrasilCoreError extends Error {
  readonly code: YggdrasilCoreErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;
  // .cause when present
}
```

### `invalid_uuid`

Raised by `undashUuid` / `dashUuid` when the input doesn't match either the
32-char undashed or the 36-char dashed form. `context.value` carries the
offending input.

### `invalid_textures_input`

Raised by `buildTexturesPayload` when:

- `profileId` isn't 32 hex chars.
- `profileName` is empty.

Also raised by `decodeTexturesPayloadBase64` when the base64 doesn't decode or
the decoded text isn't JSON. In those cases `cause` is set to the underlying
exception.

### `invalid_png`

Raised by `assertPngBuffer` when:

- Buffer is too short (< 24 bytes).
- PNG signature doesn't match.
- First chunk isn't `IHDR`.
- Width / height aren't in the kind's allowed set.

`context.kind` is `'skin'` or `'cape'`. `context.reason` is a human-readable
description.

## Recommended top-level handler

```ts
import {
  isYggdrasilClientError,
  isYggdrasilClientErrorCode,
  YggdrasilClientErrorCodes,
} from '@loontail/yggdrasil-client';
import {
  isYggdrasilCoreError,
  YggdrasilCoreErrorCodes,
} from '@loontail/yggdrasil-core';

export function handleYggdrasilError(err: unknown): UiError {
  if (isYggdrasilClientErrorCode(err, YggdrasilClientErrorCodes.NETWORK)) {
    return { kind: 'offline', message: 'Server unreachable.' };
  }
  if (isYggdrasilClientErrorCode(err, YggdrasilClientErrorCodes.HTTP_ERROR)) {
    const status = err.context?.status ?? 0;
    if (status === 403) return { kind: 'badCredentials' };
    if (status === 429) return { kind: 'rateLimited' };
    return { kind: 'server', message: `HTTP ${status}` };
  }
  if (isYggdrasilClientErrorCode(err, YggdrasilClientErrorCodes.INVALID_RESPONSE)) {
    return { kind: 'server', message: 'Server returned unexpected data.' };
  }
  if (isYggdrasilCoreError(err) && err.code === YggdrasilCoreErrorCodes.INVALID_PNG) {
    return { kind: 'badFile', message: 'PNG could not be read.' };
  }
  if (isYggdrasilClientError(err) || isYggdrasilCoreError(err)) {
    return { kind: 'unknown', message: err.message };
  }
  throw err; // not ours, re-throw
}
```

Codes are stable across versions — a code rename is a breaking change and
ships with a major version bump.
