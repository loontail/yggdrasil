---
layout: home
hero:
  name: loontail-yggdrasil
  text: Self-hosted Minecraft auth
  tagline: Yggdrasil-compatible authentication, session, and player profile server packaged as a Strapi v5 plugin — plus a TypeScript launcher client with a bundled authlib-injector jar.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/
    - theme: alt
      text: Browse guides
      link: /guides/overview
    - theme: alt
      text: GitHub
      link: https://github.com/loontail/yggdrasil
features:
  - title: One repo, three packages
    details: yggdrasil-core (pure protocol library), yggdrasil-client (launcher HTTP client), strapi-plugin-yggdrasil (server + admin UI).
  - title: Vanilla client compatible
    details: The vanilla Minecraft client connects in online mode through authlib-injector, signing in against your Strapi instead of Mojang.
  - title: One access token, full surface
    details: Authenticate, refresh, validate, invalidate, join, hasJoined, profile lookup, bulk-name resolve, plus skin / cape PUT and DELETE.
  - title: Player textures included
    details: Skin and cape upload, storage, and serving are owned by the same plugin — no second service to deploy.
  - title: RSA-signed textures property
    details: Texture URLs ship inside a signed GameProfile property so authlib-injector verifies the chain end to end.
  - title: Stateless launcher client
    details: yggdrasil-client never persists tokens. Pass in apiRoot, get back YggdrasilSession; the launcher decides what to keep.
  - title: Bundled Java agent
    details: authlib-injector.jar ships inside @loontail/yggdrasil-client and a one-liner builds the -javaagent JVM argument.
  - title: Boring database surface
    details: Adds one nullable uuid column to up_users plus three plugin-owned tables. Your existing Strapi schema is left alone.
---
