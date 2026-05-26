export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/api/profiles/minecraft',
      handler: 'api.bulkProfiles',
      config: { auth: false, policies: [] },
    },
  ],
};
