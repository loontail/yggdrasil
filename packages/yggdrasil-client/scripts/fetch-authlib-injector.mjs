#!/usr/bin/env node
// Downloads the upstream `authlib-injector` jar into `vendor/` so the package
// ships a fully self-contained binary dependency. Idempotent: skips the
// network round-trip when the right version is already on disk.
//
// Version source of truth: `AUTHLIB_INJECTOR_VERSION` in
// `src/authlib-injector.ts`. Bumping the constant there is enough; the next
// `npm run build` re-downloads the new jar and the old one stays behind for
// reproducibility (delete `vendor/*.jar` to force a clean re-fetch).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..');
const vendorDir = path.join(packageRoot, 'vendor');
const sourceFile = path.join(packageRoot, 'src', 'authlib-injector.ts');

const readVersion = () => {
  const source = readFileSync(sourceFile, 'utf8');
  const match = source.match(/export const AUTHLIB_INJECTOR_VERSION = ['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(
      `Could not find AUTHLIB_INJECTOR_VERSION in ${sourceFile} — adjust the regex if the export shape changed.`,
    );
  }
  return match[1];
};

const downloadUrl = (version) =>
  `https://github.com/yushijinhun/authlib-injector/releases/download/v${version}/authlib-injector-${version}.jar`;

const fetchToBuffer = async (url) => {
  // Follow GitHub's redirect to the CDN that actually serves the asset.
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText} (${url})`);
  }
  return Buffer.from(await response.arrayBuffer());
};

const main = async () => {
  const version = readVersion();
  const jarFilename = `authlib-injector-${version}.jar`;
  const jarPath = path.join(vendorDir, jarFilename);

  mkdirSync(vendorDir, { recursive: true });

  if (existsSync(jarPath)) {
    console.log(`[authlib-injector] ${jarFilename} already vendored — skipping download.`);
    return;
  }

  const url = downloadUrl(version);
  console.log(`[authlib-injector] Downloading ${url}`);
  const buffer = await fetchToBuffer(url);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  writeFileSync(jarPath, buffer);
  console.log(`[authlib-injector] Wrote ${jarPath} (${buffer.length} bytes, sha256=${sha256}).`);
};

main().catch((error) => {
  console.error('[authlib-injector] Fetch failed:', error);
  process.exit(1);
});
