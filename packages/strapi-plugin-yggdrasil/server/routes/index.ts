import api from './api.routes';
import authserver from './authserver.routes';
import root from './root.routes';
import sessionserver from './sessionserver.routes';

/**
 * Strapi exposes a plugin's routes under a single namespaced
 * `content-api` bag; each entry shows up at `/api/<plugin>/<path>`.
 * We compose the four route files into one flat list to keep the
 * mounting predictable.
 */
const routes = {
  type: 'content-api' as const,
  routes: [...root.routes, ...authserver.routes, ...sessionserver.routes, ...api.routes],
};

export default { 'content-api': routes };
