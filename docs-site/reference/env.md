# Environment variables

The plugin itself reads zero environment variables directly — every config
value goes through Strapi's standard `env()` helper in `config/plugins.{js,ts}`.
The names below are the convention used by the snippets throughout the docs;
rename them however your deployment expects.

The client and core packages also read zero environment variables, with one
exception: `LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR` (read by
`resolveAuthlibInjectorJarPath` in `@loontail/yggdrasil-client`).

## Conventional names

| Name | Type | Used in | Default | Notes |
|---|---|---|---|---|
| `YGGDRASIL_PUBLIC_URL` | URL string | `config.publicUrl` | — (required) | Absolute API root including `/api/yggdrasil`. |
| `YGGDRASIL_SKIN_DOMAINS` | comma-separated strings | `config.skinDomains` | `[hostname(publicUrl)]` | Hosts the vanilla client may load textures from. |
| `YGGDRASIL_SERVER_NAME` | string | `config.serverName` | `Loontail Yggdrasil` | Free-form display name. |
| `YGGDRASIL_TOKEN_TTL` | integer (seconds) | `config.tokens.accessTtlSeconds` | `1296000` (15 days) | Per-token TTL. |
| `YGGDRASIL_TOKEN_CAP` | integer | `config.tokens.maxPerUser` | `10` | Per-user token cap (FIFO eviction). |
| `YGGDRASIL_PRIVATE_KEY_PATH` | path | `config.privateKeyPath` | `data/yggdrasil/keys/active.key.pem` | Active signing key. Generated on first boot if missing. |
| `YGGDRASIL_JOIN_BACKEND` | `memory` \| `db` | `config.joinBackend` | `memory` | Backend for the join-sessions store. Today both values route to memory. |

## Yggdrasil-client only

### `LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR`

Override the directory where `resolveAuthlibInjectorJarPath()` looks for the
bundled `authlib-injector-<version>.jar`.

Set this in packaged Electron apps where `node_modules/@loontail/yggdrasil-client/vendor/`
is inside `app.asar` and therefore not reachable by the JVM:

```ts
import { app } from 'electron';
import path from 'node:path';

if (app.isPackaged) {
  process.env.LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR =
    path.join(process.resourcesPath, 'authlib-injector');
}
```

The helper reads the value once per call. Setting it after a `resolveAuthlibInjectorJarPath()`
that already succeeded has no effect on previously-returned paths (they're
already absolute strings).

See [authlib-injector](../guides/authlib-injector) for the full packaging
flow.

## Strapi-level variables

These aren't read by the plugin, but the plugin's correctness depends on
them being set sensibly on the Strapi host:

| Strapi var | Why it matters |
|---|---|
| `HOST` / `PORT` | Determines what the dev server binds to. Must be reachable from launcher / vanilla client when testing locally. |
| `APP_KEYS` | Standard Strapi requirement. Plugin doesn't use it directly, but Strapi refuses to boot without it. |
| `DATABASE_*` | Drives Knex. The bootstrap step's partial unique index works best on Postgres; SQLite tolerates it; MySQL handles it. |
| `JWT_SECRET` | Users-permissions tokens. The plugin doesn't issue users-permissions JWTs but the host project still needs this. |

## Production checklist

- [ ] `YGGDRASIL_PUBLIC_URL` is HTTPS in production. authlib-injector trusts
      the keys served at that URL; MITM = forged textures and worse.
- [ ] `YGGDRASIL_PRIVATE_KEY_PATH` points at a file outside the application
      tree (e.g. `/etc/yggdrasil/keys/active.key.pem`) with mode `0600`.
- [ ] `YGGDRASIL_SKIN_DOMAINS` lists every host the vanilla client should
      accept skins from. If your CDN serves PNGs from a different domain,
      add it.
- [ ] `YGGDRASIL_TOKEN_TTL` matches your security model. The 15-day default
      is fine for casual deployments; tighten to a few hours if the threat
      model includes shared launcher installs.
- [ ] Database backups include `yggdrasil_tokens` (so users don't have to
      reauthenticate after restore), `yggdrasil_player_skins`, and
      `yggdrasil_player_capes`.
- [ ] Disk backups include `public/yggdrasil/textures/` (PNG files) and
      `data/yggdrasil/keys/` (signing keys + archive).
