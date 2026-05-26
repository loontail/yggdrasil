export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'root.meta',
      config: { auth: false, policies: [] },
    },
  ],
};
