export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/sessionserver/session/minecraft/join',
      handler: 'sessionserver.join',
      config: { auth: false, policies: [] },
    },
    {
      method: 'GET',
      path: '/sessionserver/session/minecraft/hasJoined',
      handler: 'sessionserver.hasJoined',
      config: { auth: false, policies: [] },
    },
    {
      method: 'GET',
      path: '/sessionserver/session/minecraft/profile/:uuid',
      handler: 'sessionserver.profile',
      config: { auth: false, policies: [] },
    },
  ],
};
