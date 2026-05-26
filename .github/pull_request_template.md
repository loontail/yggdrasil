## Summary

<!-- What does this PR do, in 1-3 sentences. -->

## Affected package(s)

<!-- Check every package whose published surface or behaviour changes. The release
     workflow auto-bumps + publishes each box that is ticked here (because their
     files changed), so leaving an extra one ticked is safe but wasteful. -->

- [ ] `@loontail/yggdrasil-core`
- [ ] `@loontail/yggdrasil-client`
- [ ] `@loontail/strapi-plugin-yggdrasil`

## Changes

<!-- Bullet list of the substantive changes. -->

-

## Why

<!-- The motivation. Link to the issue if there is one. -->

## Breaking changes

<!-- Delete this section if none. -->
<!-- Renamed/removed public exports, changed Zod schemas, changed Yggdrasil
     endpoint URLs or payload shapes, dropped or renamed Strapi content-type
     fields, removed admin routes, etc. List each break here and call it out
     in the PR title with `!` (e.g. `feat(plugin)!: …`). -->

## Test plan

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] New behaviour has a unit test (or a note why it doesn't)
- [ ] If the public protocol changed, the README / package descriptions are
      updated to match

## Notes for reviewer

<!-- Anything you want the reviewer to look at first. Optional. -->
