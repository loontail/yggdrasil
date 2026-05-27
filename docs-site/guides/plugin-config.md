# Configuration

Plugin config goes under `config/plugins.{js,ts}` keyed by `yggdrasil`. The
defaults live in `server/config.ts`; the validator runs on plugin load and
refuses to boot the plugin if something is off.

## Full surface

```js
// config/plugins.js
module.exports = ({ env }) => ({
  yggdrasil: {
    enabled: true,
    resolve: '@loontail/strapi-plugin-yggdrasil',
    config: {
      publicUrl: env('YGGDRASIL_PUBLIC_URL', ''),
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

## Keys

### `publicUrl` (required)

Absolute URL of the Yggdrasil API root, including the `/api/yggdrasil` prefix.
Embedded into the authlib-injector `-javaagent` argument that the launcher
hands to the JVM. Trailing slashes are stripped.

The validator rejects empty strings and non-URL values. There is no default —
booting without it is an error.

Examples:

- Dev: `http://localhost:1337/api/yggdrasil`
- Prod: `https://auth.example.com/api/yggdrasil`
- Reverse-proxied: `https://example.com/auth/yggdrasil` (whatever your proxy maps).

### `skinDomains` (optional)

Array of hostnames the client is allowed to load skin / cape textures from.
authlib-injector exposes this list as
`com.mojang.authlib.yggdrasil.YggdrasilSessionService#skinDomains` — the vanilla
client refuses to render textures from any other origin.

Default: `[hostname(publicUrl)]` (the hostname only, without the port —
`URI.getHost()` in the JDK strips ports). Override only if your textures are
served from a CDN or separate object storage:

```js
skinDomains: ['auth.example.com', 'cdn.example.net']
```

### `serverName`, `implementationName`, `implementationVersion`

Free-form display strings surfaced via the metadata endpoint:

```json
{
  "meta": {
    "serverName":            "Loontail Yggdrasil",
    "implementationName":    "loontail-yggdrasil",
    "implementationVersion": "1.0.0"
  }
}
```

authlib-injector logs these on startup. `serverName` shows up in some
third-party launchers. None of them are validated against a hostname or version
scheme — anything non-empty works.

### `tokens.accessTtlSeconds`

How long a freshly issued access token is valid. Default: `60 * 60 * 24 * 15`
(15 days). The validator requires `> 0`.

Shorter values force more frequent refreshes; longer values reduce server load
but keep stale tokens reachable for longer if a launcher install is compromised.
15 days is a deliberate middle ground.

### `tokens.maxPerUser`

Cap on the number of active tokens per user. Default: `10`. When a user
authenticates and they already have this many active tokens, the plugin deletes
the oldest before issuing the new one (FIFO eviction). The validator requires
`> 0`.

Bump this if you ship multiple launchers per user (mobile + desktop + web), or
if you mint a new token on every relaunch instead of refreshing — but the
better fix in that case is to call `refresh` instead of `authenticate`.

### `privateKeyPath`

Path to the active RSA private key. Default:
`data/yggdrasil/keys/active.key.pem`. Resolved relative to the Strapi project
root if not absolute.

The plugin will:

- Load it if the file exists.
- Generate a fresh RSA-4096 keypair and write it there if not.

In both cases the public half is written next to it as `active.pub.pem`. The
public key is what gets advertised via the metadata endpoint. See
[Texture signing](./signing) for the rotation flow.

For production, point at a path outside the Strapi tree (`/etc/yggdrasil/keys/active.key.pem`)
and set the file mode to `0600`.

### `joinBackend`

Either `'memory'` or `'db'`. Default: `'memory'`.

Today both values route to the in-memory backend (a `Map` swept every 5
seconds, entries expiring after 30 seconds). The `'db'` setting is reserved for
a future SQL-backed implementation that survives restarts and is shared across
multi-node deployments.

If you run more than one Strapi behind a load balancer, sticky sessions on the
`/sessionserver/session/minecraft/join` route are required while `'memory'` is
the only working backend.

## Environment variables in the example above

| Var | Maps to |
|---|---|
| `YGGDRASIL_PUBLIC_URL` | `publicUrl` |
| `YGGDRASIL_SKIN_DOMAINS` | `skinDomains` (comma-separated) |
| `YGGDRASIL_SERVER_NAME` | `serverName` |
| `YGGDRASIL_TOKEN_TTL` | `tokens.accessTtlSeconds` |
| `YGGDRASIL_TOKEN_CAP` | `tokens.maxPerUser` |
| `YGGDRASIL_PRIVATE_KEY_PATH` | `privateKeyPath` |
| `YGGDRASIL_JOIN_BACKEND` | `joinBackend` |

These names are conventions used by the snippets, not anything the plugin
hard-codes. Rename them however you like — the only thing the plugin reads is
the resolved `config.<key>` value.

## Reading the resolved config at runtime

If you need to read the merged config from your own Strapi code (custom
controller, lifecycle hook, …):

```ts
const config = strapi.config.get<YggdrasilPluginConfig>('plugin::yggdrasil');
console.log(config.publicUrl);
```

The plugin's own services use the same path. The `readConfig` helper in
`server/config.ts` adds a step that derives `skinDomains` from `publicUrl`
when the array is empty — if you read the raw `strapi.config.get` value you'll
see an empty array; if you import and call `readConfig(strapi)` you'll see the
derived defaults.
