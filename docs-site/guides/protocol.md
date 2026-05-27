# Yggdrasil protocol primer

[Yggdrasil](https://wiki.vg/Authentication) is Mojang's HTTP authentication
protocol. The vanilla Minecraft client doesn't know about your server — it always
talks to `authserver.mojang.com` and `sessionserver.mojang.com`.
[authlib-injector](https://github.com/yushijinhun/authlib-injector) is a JVM agent
that rewrites these URLs at runtime to point at any Yggdrasil-compatible host. This
plugin implements that host.

The full endpoint catalogue is in the [endpoints reference](../reference/endpoints).
This page is a tour of the protocol for readers who haven't seen it before.

## Discovery (ALI metadata)

When the JVM starts with `-javaagent:authlib-injector.jar=<apiRoot>`, the agent
issues `GET <apiRoot>/` and reads:

- `meta.serverName` / `meta.implementationName` / `meta.implementationVersion` —
  free-form display strings.
- `skinDomains[]` — hostnames the client is allowed to load skin / cape textures
  from. Mojang's official client whitelists `*.mojang.com` and `*.minecraft.net`;
  authlib-injector overrides this list from the metadata.
- `signaturePublickey` / `signaturePublickeys[]` — PEM-encoded RSA public keys.
  The client verifies the `signature` on each `textures` property against any of
  these keys.
- `meta.feature.*` — optional feature flags (`non_email_login`,
  `enable_profile_key`, etc) consumed by authlib-injector.

The plugin generates `signaturePublickey` from `data/yggdrasil/keys/active.key.pem`
on first boot. `signaturePublickeys[]` includes the active key plus any
`data/yggdrasil/keys/archive/*.pub.pem` — see [Texture signing](./signing).

## Authentication (`/authserver/*`)

Four endpoints, all POSTs with JSON bodies, no cookies, no `Authorization` header.

| Endpoint | Purpose |
|---|---|
| `POST /authserver/authenticate` | Trade username + password for `accessToken` + `clientToken`. |
| `POST /authserver/refresh` | Trade an `accessToken` for a fresh one. The old one is invalidated. |
| `POST /authserver/validate` | Returns `204` if the token is still good, `403` otherwise. |
| `POST /authserver/invalidate` | Drop a token explicitly. |

The successful payload from `authenticate` and `refresh` is a `YggdrasilSession`:

```jsonc
{
  "accessToken": "8f3c…",            // opaque, max 64 chars
  "clientToken": "01e1…",            // launcher device id, reused on refresh
  "availableProfiles": [
    { "id": "11111111111111111111111111111111", "name": "steve" }
  ],
  "selectedProfile":   { "id": "11111111111111111111111111111111", "name": "steve" },
  "user": { /* optional, only when requestUser: true */ }
}
```

`id` is a 32-character undashed lowercase hex UUID. The same value lives in
`up_users.uuid`.

## Join (server-side multiplayer)

When a player clicks "Join Server", the vanilla client and the multiplayer server
do a three-step handshake:

1. The server computes a `serverId` (SHA1 of the server's public key, salt, and
   the shared secret) and sends it to the client.
2. The client POSTs to `/sessionserver/session/minecraft/join` with its
   `accessToken`, its `selectedProfile` UUID, and the `serverId`. The plugin
   stores this as a short-lived join session (TTL = 30 seconds).
3. The server GETs `/sessionserver/session/minecraft/hasJoined?username=<name>&serverId=<id>&ip=<addr>`.
   The plugin matches the cached join session by username + serverId, returns
   a signed `GameProfile` if found and within TTL, or `204 No Content` if not.

The signed `textures` property in the returned profile is the only way the joining
server learns the player's skin URL.

## Profile lookups

| Endpoint | Purpose |
|---|---|
| `GET /sessionserver/session/minecraft/profile/:uuid` | Single profile by UUID. `?unsigned=false` (default) includes the signed `textures` property; `?unsigned=true` strips the signature. |
| `POST /api/profiles/minecraft` | Bulk name → profile lookup. Body is a flat JSON array of usernames (max 10). Response is a flat array of `{ id, name }` — names not found are omitted, matching Mojang's behaviour. |

## Textures inside profiles

A `GameProfile.properties[]` array can carry a single entry named `textures`. Its
`value` is a base64-encoded JSON object:

```jsonc
{
  "timestamp": 1716700000000,
  "profileId": "11111111111111111111111111111111",
  "profileName": "steve",
  "textures": {
    "SKIN": {
      "url": "http://localhost:1337/yggdrasil/textures/skins/1111…-aabbccddeeff.png",
      "metadata": { "model": "slim" }   // present only for the SLIM variant
    },
    "CAPE": {
      "url": "http://localhost:1337/yggdrasil/textures/capes/1111…-001122334455.png"
    }
  }
}
```

The `signature` field on the property is a base64-encoded RSA-SHA1 signature over
the base64-encoded `value`. authlib-injector verifies this signature against one
of the public keys from the metadata endpoint.

`@loontail/yggdrasil-core` exposes the structure as `TexturesPayload` with
`buildTexturesPayload` / `encodeTexturesPayloadBase64` / `decodeTexturesPayloadBase64`
— see [Textures payload](./core-textures-payload).

## Texture mutation (non-protocol convenience)

The Yggdrasil spec doesn't standardise skin upload — Mojang has its own REST API
for that. authlib-injector forks define their own. This plugin uses:

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /textures/:uuid` | none | Convenience: return `{ skin: { url, variant } \| null, cape: { url } \| null }` for a player. |
| `PUT /textures/skin` | Bearer token | Multipart upload (`file` + `variant`). |
| `PUT /textures/cape` | Bearer token | Multipart upload (`file`). |
| `DELETE /textures/skin` | Bearer token | Clear the caller's skin. |
| `DELETE /textures/cape` | Bearer token | Clear the caller's cape. |

The `accessToken` in the `Authorization: Bearer …` header identifies the owner.
There is no per-user-by-id route — a caller can only mutate their own textures.

`@loontail/yggdrasil-client` wraps these as `client.uploadSkin`, `client.uploadCape`,
`client.deleteSkin`, `client.deleteCape`, `client.getTextures`.

## Error envelope

Every non-2xx response from a Yggdrasil endpoint uses a uniform envelope:

```jsonc
{
  "error": "ForbiddenOperationException",
  "errorMessage": "Invalid credentials.",
  "cause": "optional, additional context"
}
```

The canonical `error` strings (`YggdrasilErrorKinds` in
`@loontail/yggdrasil-core`):

- `ForbiddenOperationException` — bad credentials, expired token, missing
  permission.
- `IllegalArgumentException` — malformed input (Zod schema rejected the body).
- `ResourceException` — file not found, no such profile.

`@loontail/yggdrasil-client` reads this envelope on every non-2xx and surfaces it
on `YggdrasilClientError.context.body`.
