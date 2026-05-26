import type { StrapiInstance } from './types';

/**
 * `register` runs before Strapi loads content-types and routes. We
 * use it to plug the Yggdrasil error-shape middleware into the global
 * pipeline so that any throw from a Yggdrasil route is rendered as a
 * canonical `{ error, errorMessage }` envelope.
 *
 * The middleware itself is registered via Strapi's plugin exports and
 * is name-resolved as `plugin::yggdrasil.error-shape`. We append it
 * to the `middlewares` array on the global server config.
 */
export default async ({ strapi }: { strapi: StrapiInstance }): Promise<void> => {
  const existing = (strapi.config.get('middlewares', []) as unknown[]) ?? [];
  const middlewareId = 'plugin::yggdrasil.error-shape';
  if (Array.isArray(existing) && !existing.includes(middlewareId)) {
    (strapi.config as { set?: (k: string, v: unknown) => void }).set?.('middlewares', [
      ...existing,
      middlewareId,
    ]);
  }
};
