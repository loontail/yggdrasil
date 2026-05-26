/**
 * Strapi v5 looks for `./strapi-server` (resolved via the package's
 * `exports` map) when loading a plugin. After the package is built,
 * the compiled JS lives at `dist/server/index.js` and `package.json`
 * points there directly — this stub exists only so a consumer using
 * the source via `npm link` / workspace path also resolves cleanly.
 */
export { default } from './server/index';
