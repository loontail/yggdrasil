import type { ComponentType } from 'react';
import pluginPkg from '../../package.json';
import Initializer from './components/Initializer';
import PluginIcon from './components/PluginIcon';
import pluginId from './pluginId';

const name: string = pluginPkg.strapi.name;

const prefixPluginTranslations = (
  trad: Record<string, string>,
  id: string,
): Record<string, string> =>
  Object.fromEntries(Object.entries(trad).map(([key, value]) => [`${id}.${key}`, value]));

export default {
  register(app: {
    addMenuLink: (config: {
      to: string;
      icon: ComponentType;
      intlLabel: { id: string; defaultMessage: string };
      Component: () => Promise<{ default: ComponentType }>;
      permissions: unknown[];
    }) => void;
    registerPlugin: (config: {
      id: string;
      initializer: ComponentType<{ setPlugin: (id: string) => void }>;
      isReady: boolean;
      name: string;
    }) => void;
  }) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Yggdrasil',
      },
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
      permissions: [],
    });

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap() {},

  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) =>
        import(`./translations/${locale}.json`)
          .then(({ default: data }: { default: Record<string, string> }) => ({
            data: prefixPluginTranslations(data, pluginId),
            locale,
          }))
          .catch(() => ({ data: {}, locale })),
      ),
    );
    return importedTrads;
  },
};
