# Loontail Yggdrasil

A custom Yggdrasil-compatible authentication server for Minecraft,
packaged as a Strapi v5 plugin and a TypeScript client.

It lets players log in through a custom launcher, distributes custom
skins to other players in-game (via `authlib-injector`), and keeps a
single source of truth in the existing Strapi `up_users` table.

## Packages

| Package | Purpose |
|---|---|
| [`@loontail/yggdrasil-core`](./packages/yggdrasil-core)              | Types, Zod schemas, UUID helpers, error registry — shared between server and client. |
| [`@loontail/strapi-plugin-yggdrasil`](./packages/strapi-plugin-yggdrasil) | Strapi v5 plugin exposing the Yggdrasil protocol endpoints under `/api/yggdrasil/`. |
| [`@loontail/yggdrasil-client`](./packages/yggdrasil-client)          | HTTP client + bundled `authlib-injector.jar` + `-javaagent` helper, for use in a Minecraft launcher. |

## Topology

- **Source of truth** for users: Strapi `up_users` (the plugin adds a
  single `uuid` column at bootstrap; no other schema changes).
- **Skins / capes**: owned by the existing `skins-registry` Strapi
  plugin. Yggdrasil only reads `up_users.skin` / `up_users.cape`.
- **Skin variant detection** (classic / slim): runtime via
  `detectMojangSkinVariant` from `@loontail/minecraft-kit`.
- **authlib-injector**: the Java agent ships inside the
  `@loontail/yggdrasil-client` package as a bundled jar.

## Workspace

```sh
npm install
npm run verify         # turbo run lint typecheck test build
```

Turborepo handles task ordering (`yggdrasil-client` and
`strapi-plugin-yggdrasil` depend on `yggdrasil-core` being built first).

## Releases

Independent per-package semver via [Changesets](https://github.com/changesets/changesets).
One PR = one changeset. CI publishes on merge to `main`.

## License

MIT.
