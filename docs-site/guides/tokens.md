# Tokens & sessions

The plugin issues two opaque tokens on `/authserver/authenticate`. Both are stored
server-side in the `yggdrasil_tokens` table; the client treats them as opaque
strings.

| Token | Length | Role |
|---|---|---|
| `accessToken` | up to 64 chars (32 random bytes → hex) | Identifies the session. Rotated on `/refresh`. |
| `clientToken` | up to 64 chars | Identifies the launcher install. Reused across refreshes — the same device keeps the same `clientToken` even as `accessToken` rotates. |

## Lifecycle

```
authenticate ─┐
              ▼
        yggdrasil_tokens row
              │
              ├──  validate    (204 if alive, 403 otherwise)
              │
              ├──  refresh     (delete old row, issue new accessToken,
              │                 keep clientToken if provided)
              │
              ├──  invalidate  (delete row, idempotent)
              │
              ▼
       expiresAt <= now()
              │
              ▼
       hourly cleanup tick
       (DELETE FROM yggdrasil_tokens WHERE expiresAt <= NOW())
```

## TTL and per-user cap

Both are configured under `tokens.*` in the plugin config:

```js
tokens: {
  accessTtlSeconds: 60 * 60 * 24 * 15,  // 15 days (default)
  maxPerUser: 10,                       // FIFO eviction beyond this count
}
```

`expiresAt = issuedAt + accessTtlSeconds`. When a user authenticates and they
already have `maxPerUser` active tokens, the plugin deletes the oldest before
issuing the new one. Combined with the hourly cleanup tick this keeps the table
bounded under heavy usage (Electron launchers that mint a new token on every
relaunch instead of refreshing).

## Persistence rules for the launcher

`@loontail/yggdrasil-client` never touches disk. The launcher decides what to
persist. The common shape is:

```ts
type SavedSession = {
  accessToken: string;
  clientToken: string;
  uuid: string;        // selectedProfile.id, used for offline display
  username: string;    // for the menu
  savedAt: number;     // ms epoch
};
```

`accessToken` and `clientToken` must be stored in OS-level secure storage —
Keychain on macOS, Credential Manager on Windows, libsecret / KWallet on Linux.
A bare-config-file approach is acceptable for development, never for shipping.

The plain UUID and username can live wherever (config JSON is fine) — they're not
secrets.

## Refresh strategy

On launcher startup:

1. Load `SavedSession` from secure storage. If missing → prompt for credentials,
   call `authenticate`, store the result, done.
2. Call `client.validate({ accessToken, clientToken })`.
   - `true` (204) → token is still good. Use it.
   - `false` (403) → continue to step 3.
3. Call `client.refresh({ accessToken, clientToken })`.
   - Success → store the rotated `accessToken` (keep the same `clientToken`).
   - Throws `YggdrasilClientError(http_error, status: 403)` → refresh refused.
     Drop saved tokens and prompt for credentials.

The plugin invalidates the previous `accessToken` as a side effect of `refresh`,
so save the new one before continuing.

## Invalidate vs. token expiry

The plugin does not ship a `/authserver/signout` endpoint. Launchers can:

1. Call `client.invalidate({ accessToken, clientToken })`. This deletes the row
   immediately. Best-effort — failures shouldn't block the local sign-out.
2. Drop the saved tokens locally. The row expires server-side via TTL.

Both are valid. `invalidate` is friendlier to the server (the row disappears
immediately instead of sitting until cleanup), but it's a network round-trip
that can fail.

## Token validation policy

The plugin's `yggdrasil-token-auth` policy guards the texture mutation routes
(`PUT /textures/skin`, etc). It reads the `Authorization: Bearer <token>` header,
looks the token up in `yggdrasil_tokens`, checks `expiresAt > now()`, and
attaches the loaded user to `ctx.state.yggdrasilUser` before calling the
controller.

Expired tokens are deleted eagerly on validation — the policy returns a 403 to
the client and the row is gone by the time the next request arrives.

## Token cleanup tick

`bootstrap.ts` starts an interval at `setInterval(cleanup, 60 * 60 * 1000)` — one
hour. The tick runs `DELETE FROM yggdrasil_tokens WHERE expiresAt <= NOW()`.

The interval is registered on the strapi instance so the `destroy()` hook can
clear it on hot reload and graceful shutdown without leaking timers.

## Join sessions (separate from auth tokens)

`/sessionserver/session/minecraft/join` does not consume an auth token directly
— it stores a short-lived "this player wants to join this server" record. The
default backend is in-memory; entries expire after 30 seconds and a sweep runs
every 5 seconds.

The `joinBackend: 'db'` config value is reserved for a future database-backed
implementation. Today both values route to memory; the difference matters only
when running multiple Strapi nodes behind a load balancer (the memory backend
is not shared).
