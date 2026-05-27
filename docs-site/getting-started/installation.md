# Installation

The three packages are published independently on npm under `@loontail/*`. Install
only the ones you need.

## Server (Strapi v5 host)

```bash
npm install @loontail/strapi-plugin-yggdrasil @loontail/yggdrasil-core
```

The plugin requires `@strapi/strapi` and `@strapi/plugin-users-permissions` v5 as
peer dependencies — they should already be in any Strapi v5 project. Bring a
database backend that Strapi supports (PostgreSQL, MySQL, SQLite). SQLite works for
development; PostgreSQL is recommended for production because the bootstrap migration
relies on `CREATE UNIQUE INDEX … WHERE` and the `up_users.uuid` partial unique index
behaves predictably there.

`@loontail/yggdrasil-core` is a transitive dependency of the plugin, but installing
it explicitly lets you reach for `validatePngBuffer`, `buildTexturesPayload`, or the
Zod schemas from your own Strapi code (custom controllers, routes, lifecycles).

## Launcher (TypeScript app)

```bash
npm install @loontail/yggdrasil-client @loontail/yggdrasil-core
```

`@loontail/yggdrasil-client` re-exports the protocol types and `decodeTexturesPayloadBase64`
from core. Installing core directly is only useful if you want the Zod schemas, the
PNG validators, or the textures-payload codec without going through the client surface.

### Bundled `authlib-injector.jar`

`@loontail/yggdrasil-client` ships the jar inside its `vendor/` folder. The npm tarball
includes `vendor/` via the `files` field, so the jar is on disk after `npm install`.

In Electron apps the jar must be bundled as a resource (it cannot live inside an
`asar` archive — the JVM needs a real file path). Use `electron-builder`'s
`extraResources` to copy it next to your binary:

```jsonc
// electron-builder.yml or package.json#build
{
  "extraResources": [
    {
      "from": "node_modules/@loontail/yggdrasil-client/vendor/authlib-injector-1.2.5.jar",
      "to": "authlib-injector/authlib-injector-1.2.5.jar"
    }
  ]
}
```

At runtime, set `LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR` (or compute the path yourself)
and pass it to [`buildAuthlibInjectorJvmArg`](../guides/authlib-injector).

## Requirements

- **Node ≥ 20** for every package (`engines.node = ">=20.0.0"`).
- **Strapi ≥ 5.0** as a peer of the plugin.
- **`@strapi/plugin-users-permissions` ≥ 5.0** — Yggdrasil reads `up_users.username` /
  `up_users.email` and validates passwords through it.
- **A writable directory at `data/yggdrasil/keys/`** (or wherever `privateKeyPath`
  points to) so the plugin can generate or load the RSA-4096 signing key on first run.
- **A reachable `publicUrl`** in plugin config — clients embed it into the
  `-javaagent` argument and authlib-injector loads the metadata endpoint from it.

## Workspace (monorepo development)

If you cloned the repo and want to work on the docs or any package:

```bash
git clone https://github.com/loontail/yggdrasil.git
cd loontail-yggdrasil
npm install
npm run verify   # turbo: lint + typecheck + test + build
```

Turbo orders the builds — `yggdrasil-client` and `strapi-plugin-yggdrasil` depend on
`yggdrasil-core` being built first.

Docs are a VitePress site at the repo root:

```bash
npm run docs:dev      # local dev server with hot reload
npm run docs:build    # static build → docs-site/.vitepress/dist
npm run docs:preview  # preview the built site
```
