// Strapi v5's plugin loader resolves the package by calling
// `require.resolve(declaration.resolve)` and then expects
// `dirname(result)` to be the package root (so it can read
// `package.json` next to it). Pointing `exports["."]` at this
// root-level loader makes that arithmetic come out right, while the
// real entry point still lives in `dist/server/index.js`.
//
// Also: Strapi's `loadConfigFile` only handles `.js` and `.json`
// extensions — anything else (including `.cjs`) is silently skipped.
// Hence the filename is `loader.js` (which inherits CJS semantics
// from this package's `"type": "commonjs"`).
//
// TypeScript compiles `export default { … }` into `exports.default`
// rather than `module.exports`. Strapi expects the plugin object on
// the top-level export, so unwrap the `default` here.
const mod = require('./dist/server/index.js');
module.exports = mod?.__esModule ? mod.default : mod;
