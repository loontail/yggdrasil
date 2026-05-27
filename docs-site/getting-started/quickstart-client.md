# Client quickstart

You should already have a Strapi instance running with the
[server quickstart](./quickstart-server) completed and a user account created. The
snippets below assume `publicUrl` is `http://localhost:1337/api/yggdrasil`.

## 1. Construct the client

```ts
import { YggdrasilClient } from '@loontail/yggdrasil-client';

const client = new YggdrasilClient({
  apiRoot: 'http://localhost:1337/api/yggdrasil',
});
```

The constructor takes only `apiRoot` and an optional `fetch` override. Trailing
slashes are stripped, so passing `…/api/yggdrasil/` works too.

## 2. Sign in

```ts
const session = await client.authenticate({
  username: 'steve@example.com',
  password: 'changeme',
});

console.log(session.selectedProfile.name); // "steve"
console.log(session.selectedProfile.id);   // 32-char undashed hex UUID
console.log(session.accessToken);          // → keep this in memory or secure storage
```

The launcher owns persistence — `@loontail/yggdrasil-client` never writes to disk.
A typical Electron app keeps the access + client tokens in OS-level secure storage
(Keychain / Credential Manager / libsecret).

## 3. Refresh on next start

When the launcher starts back up, validate the saved token before reusing it. If
it's expired, refresh; if refresh fails too, prompt for credentials.

```ts
const valid = await client.validate({
  accessToken: saved.accessToken,
  clientToken: saved.clientToken,
});

if (!valid) {
  try {
    const session = await client.refresh({
      accessToken: saved.accessToken,
      clientToken: saved.clientToken,
    });
    await saveTokens(session.accessToken, session.clientToken);
  } catch {
    // refresh failed → drop the saved tokens and ask for username/password again
  }
}
```

## 4. Upload a skin

```ts
import { SkinVariants } from '@loontail/yggdrasil-client';
import { readFile } from 'node:fs/promises';

const png = await readFile('./steve.png');

await client.uploadSkin({
  accessToken: session.accessToken,
  file: png,
  variant: SkinVariants.CLASSIC,
});
```

The PNG is byte-validated client-side via `assertPngBuffer` from
`@loontail/yggdrasil-core` before the request goes out — uploads with a bad header
or non-Minecraft dimensions throw a `YggdrasilCoreError(invalid_png)` synchronously.

For capes use `client.uploadCape({ accessToken, file })`. To remove an existing
skin or cape, call `client.deleteSkin(...)` / `client.deleteCape(...)`.

## 5. Build the `-javaagent` argument

The vanilla Minecraft client doesn't know about your Strapi. authlib-injector is a
Java agent that rewrites Mojang URLs on the fly. Pass it as `-javaagent:<jar>=<apiRoot>`
to the JVM that launches the client.

```ts
import {
  buildAuthlibInjectorJvmArg,
  resolveAuthlibInjectorJarPath,
} from '@loontail/yggdrasil-client';

const jarPath = resolveAuthlibInjectorJarPath();
// /.../node_modules/@loontail/yggdrasil-client/vendor/authlib-injector-1.2.5.jar

const arg = buildAuthlibInjectorJvmArg({
  jarPath,
  apiRoot: 'http://localhost:1337/api/yggdrasil',
});
// "-javaagent:/.../authlib-injector-1.2.5.jar=http://localhost:1337/api/yggdrasil"
```

In Electron, `resolveAuthlibInjectorJarPath()` reads from the package's bundled
`vendor/` directory — that path is not valid inside a packaged app. Set
`LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR` to the `extraResources` location before
calling, or compute the path yourself. See [authlib-injector](../guides/authlib-injector)
for the details.

## 6. Hand the argument to Minecraft

Whatever spawns the Minecraft JVM (a launcher library like
[`@loontail/minecraft-kit`](https://github.com/loontail/minecraft-kit), a custom
spawner, …) needs to prepend the `-javaagent` argument and pass the Yggdrasil
session in `--accessToken` / `--uuid`. With `@loontail/minecraft-kit` the integration
looks like this:

```ts
import { MinecraftKit, AuthModes } from '@loontail/minecraft-kit';
import { buildAuthlibInjectorJvmArg, resolveAuthlibInjectorJarPath } from '@loontail/yggdrasil-client';

const kit = new MinecraftKit();
const target = await kit.targets.resolve({
  id: 'vanilla',
  directory: './minecrafts/vanilla',
  minecraft: { version: '1.20.1' },
});
await kit.install.run(await kit.install.plan(target));

const composition = await kit.launch.compose(target, {
  auth: {
    mode: AuthModes.MOJANG_SESSION,
    accessToken: session.accessToken,
    uuid: session.selectedProfile.id,
    username: session.selectedProfile.name,
  },
  extraJvmArgs: [
    buildAuthlibInjectorJvmArg({
      jarPath: resolveAuthlibInjectorJarPath(),
      apiRoot: 'http://localhost:1337/api/yggdrasil',
    }),
  ],
  memory: { minMb: 1024, maxMb: 4096 },
});
kit.launch.run(composition);
```

That's the full loop: Strapi vouches for the user, the client uploads the skin,
authlib-injector intercepts the vanilla client's auth calls, and the player connects
to any online server that trusts your Strapi.

## What's next

- [Using YggdrasilClient](../guides/client-usage) — full method surface.
- [Skin & cape upload](../guides/client-skins) — variants, validation, deletion.
- [Tokens & sessions](../guides/tokens) — lifecycle, TTL, refresh semantics.
- [Error handling](../guides/client-errors) — `YggdrasilClientError` codes.
