import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'loontail-yggdrasil',
  description:
    'Self-hosted Yggdrasil-compatible Minecraft authentication and player profile (skin/cape) server, plus a TypeScript launcher client.',
  // GitHub Pages serves the site under https://loontail.github.io/yggdrasil/.
  // Every asset URL must be prefixed with this path; an empty / "/" base would 404
  // in production while still working in `npm run docs:dev`.
  base: '/yggdrasil/',
  cleanUrls: true,
  lastUpdated: false,
  ignoreDeadLinks: true,
  markdown: {
    lineNumbers: false,
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started/', activeMatch: '^/getting-started/' },
      { text: 'Guides', link: '/guides/overview', activeMatch: '^/guides/' },
      { text: 'Reference', link: '/reference/endpoints', activeMatch: '^/reference/' },
      {
        text: 'Packages',
        items: [
          { text: '@loontail/yggdrasil-core', link: '/packages/yggdrasil-core' },
          { text: '@loontail/yggdrasil-client', link: '/packages/yggdrasil-client' },
          {
            text: '@loontail/strapi-plugin-yggdrasil',
            link: '/packages/strapi-plugin-yggdrasil',
          },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/loontail/yggdrasil' }],
    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/getting-started/' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Server quickstart', link: '/getting-started/quickstart-server' },
            { text: 'Client quickstart', link: '/getting-started/quickstart-client' },
          ],
        },
      ],
      '/guides/': [
        {
          text: 'Concepts',
          items: [
            { text: 'Overview', link: '/guides/overview' },
            { text: 'Architecture', link: '/guides/architecture' },
            { text: 'Yggdrasil protocol primer', link: '/guides/protocol' },
            { text: 'Tokens & sessions', link: '/guides/tokens' },
            { text: 'Texture signing', link: '/guides/signing' },
            { text: 'Texture storage', link: '/guides/textures' },
          ],
        },
        {
          text: 'Strapi plugin',
          items: [
            { text: 'Installation', link: '/guides/plugin-install' },
            { text: 'Configuration', link: '/guides/plugin-config' },
            { text: 'Bootstrap & migrations', link: '/guides/plugin-bootstrap' },
            { text: 'Admin UI', link: '/guides/plugin-admin' },
            { text: 'Content types', link: '/guides/plugin-content-types' },
          ],
        },
        {
          text: 'Launcher client',
          items: [
            { text: 'Using YggdrasilClient', link: '/guides/client-usage' },
            { text: 'authlib-injector', link: '/guides/authlib-injector' },
            { text: 'Skin & cape upload', link: '/guides/client-skins' },
            { text: 'Error handling', link: '/guides/client-errors' },
          ],
        },
        {
          text: 'Core helpers',
          items: [
            { text: 'UUID helpers', link: '/guides/core-uuid' },
            { text: 'PNG validation', link: '/guides/core-png' },
            { text: 'Textures payload', link: '/guides/core-textures-payload' },
            { text: 'Schemas & types', link: '/guides/core-schemas' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Endpoints', link: '/reference/endpoints' },
            { text: 'Error codes', link: '/reference/errors' },
            { text: 'Environment variables', link: '/reference/env' },
            { text: 'Database schema', link: '/reference/db' },
            { text: 'Plugin config keys', link: '/reference/plugin-config' },
          ],
        },
      ],
      '/packages/': [
        {
          text: 'Packages',
          items: [
            { text: '@loontail/yggdrasil-core', link: '/packages/yggdrasil-core' },
            { text: '@loontail/yggdrasil-client', link: '/packages/yggdrasil-client' },
            {
              text: '@loontail/strapi-plugin-yggdrasil',
              link: '/packages/strapi-plugin-yggdrasil',
            },
          ],
        },
      ],
    },
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    footer: { message: 'MIT License', copyright: '© 2026 loontail' },
    editLink: {
      pattern: 'https://github.com/loontail/yggdrasil/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub',
    },
  },
});
