export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/authserver/authenticate',
      handler: 'authserver.authenticate',
      config: { auth: false, policies: [] },
    },
    {
      method: 'POST',
      path: '/authserver/refresh',
      handler: 'authserver.refresh',
      config: { auth: false, policies: [] },
    },
    {
      method: 'POST',
      path: '/authserver/validate',
      handler: 'authserver.validate',
      config: { auth: false, policies: [] },
    },
    {
      method: 'POST',
      path: '/authserver/invalidate',
      handler: 'authserver.invalidate',
      config: { auth: false, policies: [] },
    },
  ],
};
