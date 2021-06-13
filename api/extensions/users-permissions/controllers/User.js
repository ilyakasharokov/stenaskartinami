// users/me with media and relational fields
const { sanitizeEntity } = require('strapi-utils');

const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });

module.exports = {
  async me(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }

    const userQuery = await strapi.query('user', 'users-permissions');
    const userWithMedia = await userQuery.findOne({ id: ctx.state.user.id });

    const data = sanitizeUser(userWithMedia, { model: userQuery.model });
    ctx.send(data);
  },

  async updateme(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const { id } = ctx.state.user;
    console.log('id');
    console.log(id);
    const { artId } = ctx.request.body;
    console.log('body');
    console.log(artId);

    const user = await strapi.plugins['users-permissions'].services.user.fetch({
      id,
    });
    console.log('user');
    console.log(user);

    const art = await strapi.services.art.fetch({
      artId,
    });
    console.log('art');
    console.log(art);

    console.log('userarts')
    console.log(user.arts);

    let updateData = {
      arts: [...user.arts, art],
    };

    const data = await strapi.plugins['users-permissions'].services.user.edit({ id }, updateData);

    ctx.send(sanitizeUser(data));
  },

};