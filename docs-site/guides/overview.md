# Guides overview

The guides are grouped into four bands. Pick the one that matches what you're
trying to do.

## Concepts

Read these first if you're new to the project — they explain the shape of the
system and the protocol it implements.

- [Architecture](./architecture) — how the three packages fit together.
- [Yggdrasil protocol primer](./protocol) — endpoints, payloads, what the vanilla
  client expects.
- [Tokens & sessions](./tokens) — access / client token lifecycle, refresh,
  invalidate, cleanup.
- [Texture signing](./signing) — RSA key pair, signed `textures` property, key
  rotation.
- [Texture storage](./textures) — file layout, revisions, upload, deletion.

## Strapi plugin

For ops setting up the server.

- [Installation](./plugin-install) — register the plugin, pick a `publicUrl`.
- [Configuration](./plugin-config) — every config key and what it controls.
- [Bootstrap & migrations](./plugin-bootstrap) — what the plugin does to your
  database on first boot.
- [Admin UI](./plugin-admin) — the texture browser under `/admin/plugins/yggdrasil`.
- [Content types](./plugin-content-types) — `yggdrasil_tokens`,
  `yggdrasil_player_skins`, `yggdrasil_player_capes` schemas.

## Launcher client

For launcher developers.

- [Using YggdrasilClient](./client-usage) — full method surface.
- [authlib-injector](./authlib-injector) — bundled jar, `-javaagent` builder,
  Electron packaging.
- [Skin & cape upload](./client-skins) — variants, validation, deletion.
- [Error handling](./client-errors) — `YggdrasilClientError` codes.

## Core helpers

For consumers reaching past the client into raw protocol pieces.

- [UUID helpers](./core-uuid) — dash / undash / random / type guards.
- [PNG validation](./core-png) — `validatePngBuffer`, `assertPngBuffer`.
- [Textures payload](./core-textures-payload) — build / encode / decode the base64
  JSON in a `GameProfile.properties[0]`.
- [Schemas & types](./core-schemas) — every Zod schema and type alias the protocol
  uses.
