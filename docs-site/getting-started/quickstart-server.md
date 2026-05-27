# Server quickstart

You need a Strapi v5 project with the `users-permissions` plugin enabled. The steps
below assume one already exists.

## 1. Install the plugin

```bash
npm install @loontail/strapi-plugin-yggdrasil @loontail/yggdrasil-core
```

## 2. Register the plugin

Strapi reads plugin configuration from `config/plugins.js` (or `.ts`). Add an entry
under the key `yggdrasil`:

```js
// config/plugins.js
module.exports = ({ env }) => ({
  yggdrasil: {
    enabled: true,
    resolve: '@loontail/strapi-plugin-yggdrasil',
    config: {
      publicUrl: env('YGGDRASIL_PUBLIC_URL', 'http://localhost:1337/api/yggdrasil'),
      skinDomains: env.array('YGGDRASIL_SKIN_DOMAINS', []),
      serverName: env('YGGDRASIL_SERVER_NAME', 'Loontail Yggdrasil'),
      implementationName: 'loontail-yggdrasil',
      implementationVersion: '1.0.0',
      tokens: {
        accessTtlSeconds: env.int('YGGDRASIL_TOKEN_TTL', 60 * 60 * 24 * 15),
        maxPerUser: env.int('YGGDRASIL_TOKEN_CAP', 10),
      },
      privateKeyPath: env('YGGDRASIL_PRIVATE_KEY_PATH', 'data/yggdrasil/keys/active.key.pem'),
      joinBackend: env('YGGDRASIL_JOIN_BACKEND', 'memory'),
    },
  },
});
```

- `publicUrl` is the absolute URL the launcher (and authlib-injector) will hit. It
  must include the `/api/yggdrasil` prefix because that's where Strapi mounts plugin
  routes by default. Trailing slashes are stripped.
- `skinDomains` defaults to `[hostname(publicUrl)]`. Add CDN hostnames here only if
  your skins are served from a different origin.
- `privateKeyPath` is resolved relative to the Strapi project root. The directory is
  created on first run if it doesn't exist.

The full schema is in the [plugin config reference](../reference/plugin-config).

## 3. Start Strapi

```bash
npm run develop
```

On boot the plugin runs five idempotent bootstrap steps (see
[Bootstrap & migrations](../guides/plugin-bootstrap) for the full sequence):

1. Adds a nullable `uuid` column to `up_users` and a partial unique index.
2. Creates the `yggdrasil_tokens`, `yggdrasil_player_skins`, `yggdrasil_player_capes`
   tables.
3. Adds cascade foreign keys from the texture tables to `up_users`.
4. Grants the Public role permission to call every Yggdrasil endpoint.
5. Generates an RSA-4096 keypair under `data/yggdrasil/keys/` if no `active.key.pem`
   exists.

The Strapi log prints one line per phase. If any phase fails, fix the underlying
issue and restart — every phase is safe to re-run.

## 4. Verify the metadata endpoint

The root endpoint advertises the server's capabilities, signing public keys, and
allowed skin domains. authlib-injector hits it once at JVM start.

```bash
curl http://localhost:1337/api/yggdrasil/
```

You should see something like:

```json
{
  "meta": {
    "serverName": "Loontail Yggdrasil",
    "implementationName": "loontail-yggdrasil",
    "implementationVersion": "1.0.0"
  },
  "skinDomains": ["localhost"],
  "signaturePublickey": "-----BEGIN PUBLIC KEY-----\nMIIC...\n-----END PUBLIC KEY-----\n"
}
```

If `signaturePublickey` is missing, the key generation phase failed — check the
Strapi log for an error from `init crypto`.

## 5. Create a player

The plugin reuses the `up_users` table owned by `users-permissions`. Create a user
the regular way:

```bash
curl -X POST http://localhost:1337/api/auth/local/register \
  -H 'content-type: application/json' \
  -d '{"username":"steve","email":"steve@example.com","password":"changeme"}'
```

The first time this user signs in through Yggdrasil, the plugin assigns them a
32-character undashed UUID in `up_users.uuid`.

## 6. Authenticate

```bash
curl -X POST http://localhost:1337/api/yggdrasil/authserver/authenticate \
  -H 'content-type: application/json' \
  -d '{"username":"steve@example.com","password":"changeme"}'
```

Response (truncated):

```json
{
  "accessToken": "8f3c…",
  "clientToken": "01e1…",
  "availableProfiles": [{ "id": "…uuid…", "name": "steve" }],
  "selectedProfile":  { "id": "…uuid…", "name": "steve" }
}
```

That `accessToken` is what the launcher will use to upload textures and the vanilla
client will use to authenticate against `sessionserver/session/minecraft/join`.

## 7. Wire the launcher

Continue with the [client quickstart](./quickstart-client).
