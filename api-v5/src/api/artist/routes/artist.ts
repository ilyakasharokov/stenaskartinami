export default {
  routes: [
    {
      method: 'GET',
      path: '/artists',
      handler: 'artist.find',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/artists/:id',
      handler: 'artist.findOne',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/artists',
      handler: 'artist.create',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/artists/:id/follow',
      handler: 'artist.follow',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/artists/:id/unfollow',
      handler: 'artist.unfollow',
      config: { policies: [] },
    },
  ],
};
