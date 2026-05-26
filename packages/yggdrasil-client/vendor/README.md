# Bundled authlib-injector jar

This directory ships the official
[`authlib-injector`](https://github.com/yushijinhun/authlib-injector)
jar as a binary dependency of `@loontail/yggdrasil-client`.

The filename must match `authlib-injector-<AUTHLIB_INJECTOR_VERSION>.jar`,
where `AUTHLIB_INJECTOR_VERSION` is the constant exported from
`src/authlib-injector.ts`. The runtime resolver throws
`YggdrasilClientError('authlib_injector_missing')` if the jar is absent.

## Updating

1. Download the release jar from the upstream
   [releases page](https://github.com/yushijinhun/authlib-injector/releases).
2. Replace the jar in this directory.
3. Bump `AUTHLIB_INJECTOR_VERSION` in `src/authlib-injector.ts` to
   match the new file name.
4. Add a changeset (`npm run changeset`) — bumping the jar is a
   **major** version bump of this package, since users must rebuild
   their launcher and the Strapi plugin to pick the new jar up via
   `extraResources`.

## License

`authlib-injector` is licensed under AGPLv3 with a documented
exception that permits bundling the jar in proprietary launchers and
loading it as a Java agent without forcing the launcher itself to be
AGPL-licensed. See the upstream `LICENSE.txt` for the exact wording.
