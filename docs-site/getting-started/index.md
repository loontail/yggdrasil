# Getting started

`loontail-yggdrasil` is a self-hosted Yggdrasil-compatible Minecraft authentication
server and a launcher client. The vanilla Minecraft client connects in online mode
through [authlib-injector](https://github.com/yushijinhun/authlib-injector), pointed
at your Strapi instead of Mojang.

The repo ships three packages:

| Package | Role |
|---|---|
| [`@loontail/yggdrasil-core`](../packages/yggdrasil-core) | Pure protocol types, Zod schemas, UUID helpers, PNG validation, textures-payload codec, error registry. Runtime-agnostic. |
| [`@loontail/strapi-plugin-yggdrasil`](../packages/strapi-plugin-yggdrasil) | Strapi v5 plugin: Yggdrasil endpoints under `/api/yggdrasil/*`, owns the `yggdrasil_tokens` / `yggdrasil_player_skins` / `yggdrasil_player_capes` tables, admin UI under `/admin/plugins/yggdrasil`. |
| [`@loontail/yggdrasil-client`](../packages/yggdrasil-client) | Launcher-side TypeScript HTTP client; bundles `authlib-injector.jar` and a `-javaagent` argument builder. |

Requirements:

- Node ≥ 20 for every package.
- A running Strapi v5 project with `@strapi/plugin-users-permissions` v5 enabled.
- A reachable public URL for the Strapi instance — clients embed it into the
  `-javaagent` argument, so localhost works for development but production needs
  a real hostname.

## Read next

- [Installation →](./installation) — npm dependencies for the server and the launcher.
- [Server quickstart →](./quickstart-server) — wire the plugin into a Strapi project,
  pick a `publicUrl`, and verify the metadata endpoint.
- [Client quickstart →](./quickstart-client) — sign in from a launcher, upload a skin,
  build the `-javaagent` argument, and launch the vanilla client through
  authlib-injector.

For protocol detail, signing, and storage layout, jump straight to the
[guides overview](../guides/overview).
