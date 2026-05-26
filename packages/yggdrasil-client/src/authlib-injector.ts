import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  YggdrasilClientError,
  YggdrasilClientErrorCodes,
} from './errors/yggdrasil-client-error.js';

/**
 * Version of the authlib-injector jar bundled in this package. The
 * filename in `vendor/` must match `authlib-injector-<this version>.jar`.
 *
 * Bumping this constant should be paired with replacing the vendored
 * jar and publishing a new major version (authlib-injector occasionally
 * makes breaking ALI changes).
 */
export const AUTHLIB_INJECTOR_VERSION = '1.2.5';

const JAR_FILENAME = `authlib-injector-${AUTHLIB_INJECTOR_VERSION}.jar`;

/**
 * Locate the bundled `authlib-injector` jar on disk.
 *
 * Resolution order:
 *  1. The package's own `vendor/` directory (works in dev when
 *     consumers import from `node_modules/@loontail/yggdrasil-client`).
 *  2. The {@link AUTHLIB_INJECTOR_VENDOR_DIR_ENV} environment variable
 *     pointing at a directory containing the jar (escape hatch).
 *
 * Throws {@link YggdrasilClientError} with code `authlib_injector_missing`
 * if neither location yields a readable jar.
 *
 * In a packaged Electron app, the consumer typically copies the jar
 * via `electron-builder`'s `extraResources` to `process.resourcesPath`
 * and computes the absolute path itself — there is no need to use this
 * helper in production.
 */
export const resolveAuthlibInjectorJarPath = (): string => {
  const envOverride = process.env[AUTHLIB_INJECTOR_VENDOR_DIR_ENV];
  if (envOverride) {
    const candidate = path.join(envOverride, JAR_FILENAME);
    if (existsSync(candidate)) return candidate;
  }
  const vendorDir = path.resolve(packageRoot(), 'vendor');
  const candidate = path.join(vendorDir, JAR_FILENAME);
  if (existsSync(candidate)) return candidate;
  throw new YggdrasilClientError(
    YggdrasilClientErrorCodes.AUTHLIB_INJECTOR_MISSING,
    `authlib-injector jar not found. Looked for ${JAR_FILENAME} in ${vendorDir}${envOverride ? ` and ${envOverride}` : ''}`,
    {
      context: {
        vendorDir,
        ...(envOverride ? { envOverride } : {}),
        files: existsSync(vendorDir) ? readdirSync(vendorDir) : [],
      },
    },
  );
};

/**
 * Build the `-javaagent` JVM argument that hands control to
 * `authlib-injector` and points it at the given Yggdrasil root.
 *
 * @example
 * ```ts
 * buildAuthlibInjectorJvmArg({
 *   jarPath: '/opt/launcher/resources/authlib-injector/authlib-injector-1.2.5.jar',
 *   apiRoot: 'https://my.example.com/api/yggdrasil',
 * });
 * // → -javaagent:/opt/.../authlib-injector-1.2.5.jar=https://my.example.com/api/yggdrasil
 * ```
 */
export const buildAuthlibInjectorJvmArg = (input: {
  jarPath: string;
  apiRoot: string;
}): string => `-javaagent:${input.jarPath}=${input.apiRoot}`;

/**
 * Optional override of the directory in which to look for the bundled
 * jar. Useful in environments where the package is re-bundled (e.g.
 * webpack server bundles that lose the original `vendor/`).
 */
export const AUTHLIB_INJECTOR_VENDOR_DIR_ENV = 'LOONTAIL_AUTHLIB_INJECTOR_VENDOR_DIR';

const packageRoot = (): string => {
  // After tsup, this file lives at `<pkg>/dist/index.{cjs,mjs}`, so the
  // package root is one level up. In dev (TS or via vitest), the file
  // lives at `<pkg>/src/authlib-injector.ts`, so the package root is
  // also one level up. Either way `..` from this file's directory.
  const here =
    typeof __dirname === 'string' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..');
};
