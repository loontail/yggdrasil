# Database schema

The plugin manages four schema-level changes on the host Strapi database:

1. Adds one column to `up_users`.
2. Creates `yggdrasil_tokens`.
3. Creates `yggdrasil_player_skins`.
4. Creates `yggdrasil_player_capes`.
5. Creates `yggdrasil_migrations` (bookkeeping for one-shot migrations).

All four (excluding `yggdrasil_migrations`) are Strapi content types with
`pluginOptions.content-manager.visible: false` — they're invisible in the
content manager and the content-type builder. `yggdrasil_migrations` is a
plain Knex table.

## `up_users` modification

The plugin adds **one** nullable column:

```sql
ALTER TABLE up_users ADD COLUMN uuid VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS up_users_uuid_uniq
  ON up_users (uuid) WHERE uuid IS NOT NULL;
```

| Column | Type | Notes |
|---|---|---|
| `uuid` | `varchar(32)` nullable | Filled lazily on first authentication. 32-char undashed lowercase hex. Partial unique index. |

The Strapi schema JSON for `up_users` is *not* edited — the column is added
via Knex during the bootstrap step. This keeps the host project's
`users-permissions` schema unchanged.

## `yggdrasil_tokens`

| Column | Type | Constraints |
|---|---|---|
| `id` | auto increment PK | Strapi default. |
| `user_id` | integer | Required. References `up_users.id` (no FK declared). |
| `access_token` | string(64) | Required. **Unique.** |
| `client_token` | string(64) | Required. |
| `issued_at` | datetime | Required. |
| `expires_at` | datetime | Required. |
| `created_at` / `updated_at` | datetime | Strapi defaults. |

Indices:

- Primary key on `id`.
- Unique on `access_token`.

There's no FK to `up_users.id` here — the cleanup query runs as `DELETE FROM
yggdrasil_tokens WHERE …` and the FK would only matter for cascading user
deletes, which the per-user-cap eviction already handles via the controller.

## `yggdrasil_player_skins`

| Column | Type | Constraints |
|---|---|---|
| `id` | auto increment PK | Strapi default. |
| `user_id` | integer | Required. **Unique.** Cascade FK to `up_users.id`. |
| `username` | string | Cached for admin UI. |
| `file_path` | string | Required. Absolute disk path. |
| `file_url` | string | Required. Relative public URL. |
| `file_size` | integer | Bytes. |
| `variant` | enum(`CLASSIC`, `SLIM`) | Default `CLASSIC`. |
| `created_at` / `updated_at` | datetime | Strapi defaults. |

Indices:

- Primary key on `id`.
- Unique on `user_id`.

FK:

- `user_id → up_users(id) ON DELETE CASCADE` — added by the bootstrap step
  `ensureTextureForeignKeys`. Skipped silently on SQLite (which cannot add
  FKs to existing tables).

## `yggdrasil_player_capes`

| Column | Type | Constraints |
|---|---|---|
| `id` | auto increment PK | Strapi default. |
| `user_id` | integer | Required. **Unique.** Cascade FK to `up_users.id`. |
| `username` | string | Cached for admin UI. |
| `file_path` | string | Required. Absolute disk path. |
| `file_url` | string | Required. Relative public URL. |
| `file_size` | integer | Bytes. |
| `created_at` / `updated_at` | datetime | Strapi defaults. |

Same shape as skins minus the `variant` column.

## `yggdrasil_migrations`

| Column | Type | Notes |
|---|---|---|
| `key` | string PK | Migration name (e.g. `skins-registry-merge`). |
| `completed_at` | datetime | When the migration finished. |

Created on first boot by `runSkinsRegistryMerge`. The marker row is written
inside the same Knex transaction as the data move, so a mid-migration crash
rolls everything back.

## ERD

```
   ┌───────────────────────────────┐
   │           up_users            │
   │ ──────────────────────────── │
   │ id  (PK)                      │
   │ username                      │
   │ email                         │
   │ uuid  (varchar(32), nullable, │
   │        unique partial index)  │
   │ …                             │
   └─────┬──────────────────────┬──┘
         │ cascade              │ cascade
         ▼                      ▼
┌──────────────────────┐  ┌──────────────────────┐
│ yggdrasil_player_    │  │ yggdrasil_player_    │
│   skins              │  │   capes              │
│ ──────────────────── │  │ ──────────────────── │
│ id (PK)              │  │ id (PK)              │
│ user_id (unique)     │  │ user_id (unique)     │
│ username             │  │ username             │
│ file_path            │  │ file_path            │
│ file_url             │  │ file_url             │
│ file_size            │  │ file_size            │
│ variant              │  │                      │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│   yggdrasil_tokens   │  │  yggdrasil_          │
│ ──────────────────── │  │  migrations          │
│ id (PK)              │  │ ──────────────────── │
│ user_id              │  │ key (PK)             │
│ access_token (unique)│  │ completed_at         │
│ client_token         │  └──────────────────────┘
│ issued_at            │
│ expires_at           │
└──────────────────────┘
```

## Backend differences

### PostgreSQL

- Partial unique index on `up_users.uuid WHERE uuid IS NOT NULL` works as
  intended.
- Cascade FKs on the texture tables work.
- Recommended for production.

### MySQL

- Partial unique index syntax differs; the plugin issues
  `CREATE UNIQUE INDEX IF NOT EXISTS … WHERE …` which MySQL may reject. If
  the index fails, multiple `NULL` rows are allowed but no two non-NULL
  rows can have the same UUID once the column is populated (because Knex
  enforces uniqueness at the application layer for the lazy-assignment
  path).
- Cascade FKs on the texture tables work.

### SQLite

- Partial unique index syntax tolerated; SQLite doesn't index `NULL` values
  by default, so the index works as desired.
- Cascade FKs **cannot** be added to existing tables in SQLite — the
  `ensureTextureForeignKeys` step logs a debug note and continues. Manual
  cleanup of texture rows is required after `up_users` deletion. The admin
  UI's Validate / Purge missing flow makes this manageable.
- Fine for development; not recommended for production.

## Disk layout

The DB rows reference files on disk. Layout:

```
public/yggdrasil/
  textures/
    skins/
      <uuid>-<6 random hex bytes>.png
    capes/
      <uuid>-<6 random hex bytes>.png
data/yggdrasil/
  keys/
    active.key.pem       (private key, PKCS#8)
    active.pub.pem       (public key, SPKI)
    archive/             (rotated keys)
      <name>.pub.pem
```

The `public/` tree is served by Strapi's `strapi::public` middleware at the
HTTP root, so the URLs are `/yggdrasil/textures/skins/...` and
`/yggdrasil/textures/capes/...`.

## Backup checklist

A complete backup of a Yggdrasil deployment needs:

- The Strapi database (Postgres dump / MySQL dump / SQLite file).
- `public/yggdrasil/textures/` (skin + cape PNGs).
- `data/yggdrasil/keys/` (active + archived signing keys).

The keys directory is the only thing that *cannot* be regenerated without
issuing fresh signatures and invalidating cached profiles in clients.
