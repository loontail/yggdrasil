# authlib-injector

[authlib-injector](https://github.com/yushijinhun/authlib-injector) is a Java
agent that rewrites Mojang URLs in the vanilla Minecraft client at JVM start,
redirecting them at an arbitrary Yggdrasil-compatible server. It is the bridge
between the vanilla client and this plugin.

`@loontail/yggdrasil-client` bundles the jar (currently version `1.2.5`) and
exposes two helpers for using it: `resolveAuthlibInjectorJarPath()` to find the
jar on disk, and `buildAuthlibInjectorJvmArg({ jarPath, apiRoot })` to format
the `-javaagent` argument.

## The argument

Java agents are loaded via `-javaagent:<path>=<argument>`. For authlib-injector,
the argument is the API root URL:

```
-javaagent:/path/to/authlib-injector-1.2.5.jar=https://auth.example.com/api/yggdrasil
```

`buildAuthlibInjectorJvmArg` is just a string formatter for this — but using it
keeps the constants in one place:

```ts
import {
  buildAuthlibInjectorJvmArg,
  resolveAuthlibInjectorJarPath,
} from '@loontail/yggdrasil-client';

const arg = buildAuthlibInjectorJvmArg({
  jarPath: resolveAuthlibInjectorJarPath(),
  apiRoot: 'https://auth.example.com/api/yggdrasil',
});
```

## Bundled jar

The jar is downloaded from the upstream GitHub release at `prebuild` time
(`scripts/fetch-authlib-injector.mjs`) and written to
`packages/yggdrasil-client/vendor/authlib-injector-1.2.5.jar`. The `files` field
in `package.json` includes `vendor`, so the jar ships inside the published npm
tarball.

`AUTHLIB_INJECTOR_VERSION` is exported as a const string (`'1.2.5'`). The vendor
script reads it to know what to download, and `resolveAuthlibInjectorJarPath`
uses it to compute the filename.

## Resolving the jar path

```ts
import { resolveAuthlibInjectorJarPath } from '@loontail/yggdrasil-client';

const jarPath = resolveAuthlibInjectorJarPath();
```

The lookup order:

1. **`LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR`** environment variable. If set and
   contains the expected jar, use it.
2. **The package's own `vendor/` directory.** Located via `import.meta.url` and
   `node_modules` resolution. Works in dev (`npm link`, plain `npm install`)
   and after a regular install.

Throws `YggdrasilClientError(authlib_injector_missing)` if neither source
contains the file. The error's `context` includes what was looked for and what
files were actually present in the vendor directory.

## Electron packaging

Electron's `asar` archive prevents the JVM from reaching the jar — the JVM
needs a real file path, and `node_modules/...` inside `app.asar` is virtual.
Two options:

### Option A: `extraResources`

In `electron-builder.yml` (or `package.json#build`):

```yaml
extraResources:
  - from: node_modules/@loontail/yggdrasil-client/vendor/authlib-injector-1.2.5.jar
    to: authlib-injector/authlib-injector-1.2.5.jar
```

At runtime, set the env var or pass the path directly:

```ts
import { app } from 'electron';
import path from 'node:path';
import {
  buildAuthlibInjectorJvmArg,
  AUTHLIB_INJECTOR_VERSION,
} from '@loontail/yggdrasil-client';

// In packaged builds, resourcesPath is the directory containing extraResources.
// In dev (electron .), use the original vendor path.
const jarDir = app.isPackaged
  ? path.join(process.resourcesPath, 'authlib-injector')
  : path.join(__dirname, '../node_modules/@loontail/yggdrasil-client/vendor');

process.env.LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR = jarDir;

const arg = buildAuthlibInjectorJvmArg({
  jarPath: path.join(jarDir, `authlib-injector-${AUTHLIB_INJECTOR_VERSION}.jar`),
  apiRoot: 'https://auth.example.com/api/yggdrasil',
});
```

### Option B: `extraFiles` + `asarUnpack`

`extraFiles` copies the file alongside the binary at install time. `asarUnpack`
keeps the file unpacked inside `app.asar`. Both work; `extraResources` is the
cleanest because it doesn't pollute the `node_modules` layout.

## What authlib-injector does at runtime

1. The JVM loads the jar via the `-javaagent` mechanism before the Minecraft
   main class.
2. The agent issues `GET <apiRoot>/` and reads the metadata payload — server
   name, `skinDomains`, `signaturePublickey(s)`.
3. The agent installs Java class transformers that:
   - Rewrite every `https://authserver.mojang.com/...` and
     `https://sessionserver.mojang.com/...` URL to point at `<apiRoot>/...`.
   - Override the `YggdrasilSessionService#skinDomains` array with the value
     from metadata.
   - Inject the metadata public keys into the texture verification path so
     signatures issued by your server validate.

The vanilla client doesn't know any of this happened — it sees a working
Mojang-shaped auth/session service that just happens to live at a different
URL.

## What the vanilla client expects

Once authlib-injector is loaded:

- The "Username" field in the launcher login flow accepts whatever your server
  treats as an identifier. By default that's the user's email; you can flip
  `feature.non_email_login` in the metadata response if you support
  username-as-login.
- The accessToken supplied to the client (via launcher arguments
  `--accessToken <token> --uuid <undashed> --username <name>`) is used directly
  in the join handshake. The plugin returns the player's signed `textures`
  property in `hasJoined`.
- Skin and cape URLs come back from the `textures` property and are loaded by
  the vanilla client. They must come from a domain in `meta.skinDomains` —
  otherwise the client refuses the URL.

## Updating the bundled jar

The version is pinned via the `AUTHLIB_INJECTOR_VERSION` const in
`packages/yggdrasil-client/src/authlib-injector.ts`. To bump:

1. Edit the constant.
2. Delete the old jar from `packages/yggdrasil-client/vendor/`.
3. Run `npm run fetch-authlib-injector` (or just `npm run build` — the
   `prebuild` hook fetches it).
4. Test against your own Strapi.
5. Commit the constant change. The jar itself is `.gitignore`d — the
   `fetch-authlib-injector` script runs on every CI/build to re-fetch it.
