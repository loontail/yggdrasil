# Plugin config keys

The full schema of `config/plugins.{js,ts}#yggdrasil.config`, validated on
plugin load by `server/config.ts`.

## TypeScript shape

```ts
type YggdrasilPluginConfig = {
  publicUrl: string;
  skinDomains: string[];
  serverName: string;
  implementationName: string;
  implementationVersion: string;
  tokens: {
    accessTtlSeconds: number;
    maxPerUser: number;
  };
  privateKeyPath: string;
  joinBackend: 'memory' | 'db';
};
```

## Field reference

### `publicUrl`

Absolute URL of the Yggdrasil API root, including the `/api/yggdrasil` prefix.

- **Required.** Empty strings, missing values, or non-URL strings make the
  validator throw on plugin load.
- Trailing slashes are stripped.
- Used in three places:
  - Embedded into the authlib-injector `-javaagent` argument.
  - Origin for the absolute skin / cape URLs in the signed `textures` property.
  - Derived hostname becomes the default `skinDomains` entry.

### `skinDomains`

Array of hostnames the vanilla client may load textures from. Surfaced via
the metadata endpoint as `skinDomains[]`.

- **Default:** `[new URL(publicUrl).hostname]`. The hostname only — `URI.getHost()`
  in the JDK strips the port, so `localhost:1338` wouldn't match `localhost` and
  the client would refuse texture URLs.
- Override only when textures are served from a different origin than the API
  (CDN, dedicated bucket).
- Each entry must be non-empty (`z.string().min(1)`).

### `serverName`

Free-form display name for the Yggdrasil server. Returned by the metadata
endpoint. Visible to authlib-injector at JVM start.

- **Default:** `'Loontail Yggdrasil'`.
- Validator requires non-empty.

### `implementationName`

Free-form software identifier. Surfaced via metadata.

- **Default:** `'loontail-yggdrasil'`.
- Validator requires non-empty.

### `implementationVersion`

Free-form version string. Surfaced via metadata.

- **Default:** `'0.0.1'`.
- Validator requires non-empty.
- Convention: match your deployed plugin / project version.

### `tokens.accessTtlSeconds`

Lifetime of a freshly issued access token, in seconds.

- **Default:** `60 * 60 * 24 * 15` (15 days).
- Validator requires `> 0`.
- The hourly cleanup tick deletes rows whose `expiresAt <= NOW()`.

### `tokens.maxPerUser`

Per-user cap on active tokens. When a new authentication would exceed the
cap, the oldest token row is deleted (FIFO eviction) before the new one is
inserted.

- **Default:** `10`.
- Validator requires `> 0`.
- Useful for limiting blast radius if a launcher install is compromised.

### `privateKeyPath`

Path to the active RSA private key.

- **Default:** `'data/yggdrasil/keys/active.key.pem'` (resolved relative to
  the Strapi project root if not absolute).
- The plugin loads the file if it exists, or generates a fresh RSA-4096
  keypair and writes it there if not. The matching public key goes alongside
  as `active.pub.pem`.
- Production deployments should point this outside the project tree (e.g.
  `/etc/yggdrasil/keys/active.key.pem`) and set mode `0600` on the file.

### `joinBackend`

Backend for the short-lived join-sessions store powering
`/sessionserver/session/minecraft/join` and `hasJoined`.

- **Default:** `'memory'`. Sweeps every 5 seconds, entries expire after 30
  seconds.
- **Reserved:** `'db'`. Currently routes to memory; reserved for a future
  SQL-backed implementation that survives restarts and is shared across
  multi-node deployments.
- Validator accepts only `'memory'` or `'db'`.

## Validator behaviour

On plugin load (`Strapi v5` calls `config(env)`), the plugin merges your
`config/plugins.js` entries onto the defaults and runs a validator. Any
violation makes the plugin refuse to load and Strapi logs the reason:

```
plugin::yggdrasil config invalid: publicUrl is required
plugin::yggdrasil config invalid: tokens.accessTtlSeconds must be > 0
plugin::yggdrasil config invalid: joinBackend must be 'memory' or 'db'
```

The plugin doesn't validate any *runtime* changes — if you bypass Strapi's
config and modify `strapi.config.set('plugin::yggdrasil.publicUrl', '…')`
during a request, you're on your own.

## Reading the resolved config from custom code

```ts
const config = strapi.config.get<YggdrasilPluginConfig>('plugin::yggdrasil');
console.log(config.publicUrl);
```

The plugin itself reads the config through the same path. The
`server/config.ts#readConfig(strapi)` helper additionally derives
`skinDomains` from `publicUrl` if the array is empty — use it instead of the
raw `strapi.config.get` if you want the derived defaults:

```ts
import { readConfig } from '@loontail/strapi-plugin-yggdrasil/server/config';
const config = readConfig(strapi);
```

(Note: the plugin's deep paths aren't exported in the public exports map.
Import them at your own risk — they may change without a major bump.)

## Per-environment recipes

### Local dev with SQLite

```js
yggdrasil: {
  enabled: true,
  resolve: '@loontail/strapi-plugin-yggdrasil',
  config: {
    publicUrl: 'http://localhost:1337/api/yggdrasil',
    // skinDomains defaults to ['localhost']
    // privateKeyPath defaults to 'data/yggdrasil/keys/active.key.pem'
    // joinBackend defaults to 'memory'
  },
},
```

### Production with HTTPS, separate key store, longer TTL

```js
yggdrasil: {
  enabled: true,
  resolve: '@loontail/strapi-plugin-yggdrasil',
  config: {
    publicUrl: 'https://auth.example.com/api/yggdrasil',
    skinDomains: ['auth.example.com', 'cdn.example.net'],
    serverName: 'Example Auth',
    implementationVersion: '1.0.0',
    tokens: {
      accessTtlSeconds: 60 * 60 * 24 * 30,  // 30 days
      maxPerUser: 25,
    },
    privateKeyPath: '/etc/yggdrasil/keys/active.key.pem',
  },
},
```

### Behind a path-rewriting reverse proxy

If your proxy rewrites `/auth/yggdrasil/…` → `/api/yggdrasil/…`, set
`publicUrl` to the *external* path:

```js
publicUrl: 'https://example.com/auth/yggdrasil',
```

authlib-injector hits `<publicUrl>/` for metadata. The proxy must forward the
request to Strapi's `/api/yggdrasil/` route. The plugin's routes don't move
— only the public URL the launcher sees changes.
