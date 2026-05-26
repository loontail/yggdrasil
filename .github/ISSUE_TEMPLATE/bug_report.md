---
name: Bug report
about: Report something that does not work as documented
labels: bug
---

## What happened

<!-- One or two sentences. What did you expect, what did you get instead? -->

## Affected package(s)

- [ ] `@loontail/yggdrasil-core`
- [ ] `@loontail/yggdrasil-client`
- [ ] `@loontail/strapi-plugin-yggdrasil`

## Reproduction

<!-- Minimal code, CLI steps, or curl examples. The shorter the better. -->

```ts
```

## Server / protocol context

<!-- Skip the rows that do not apply. -->

- Endpoint hit (`POST /api/yggdrasil/authserver/authenticate`, `PUT /api/yggdrasil/textures/skin`, …):
- Auth mode used (Yggdrasil access token / Strapi admin JWT / none):
- Yggdrasil-compatible client (launcher / authlib-injector / curl / other):
- Strapi version:
- Database backend (Postgres / MySQL / SQLite) + version:

## Environment

- OS + version:
- Node version (`node --version`):
- Package version(s) (e.g. `@loontail/yggdrasil-core@0.0.2`):
- npm version (`npm --version`):

## Error

<!-- Paste the full error: code, message, body. For Yggdrasil-shaped errors, include both
     `error` and `errorMessage`. For YggdrasilClientError / YggdrasilCoreError, include
     `code` + `message` + `context`. -->

```
```

## Server logs

<!-- Optional. If a Strapi-side path was involved, the bootstrap / textures.ts /
     migration log lines help a lot. Truncate to the relevant slice. -->

<details><summary>logs</summary>

```
```

</details>
