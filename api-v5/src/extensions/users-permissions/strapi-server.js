const { sanitize } = require('@strapi/utils');

const userUid = 'plugin::users-permissions.user';

module.exports = (plugin) => {
  plugin.contentTypes.user.schema.attributes.arts = {
    type: 'relation',
    relation: 'manyToMany',
    target: 'api::art.art',
  };

  plugin.contentTypes.user.schema.attributes.created_arts = {
    type: 'relation',
    relation: 'oneToMany',
    target: 'api::art.art',
    mappedBy: 'user_uploader',
  };

  const sanitizeUser = (user, ctx) =>
    sanitize.contentAPI.output(user, strapi.getModel(userUid), { auth: ctx.state.auth });

  plugin.controllers.user.me = async (ctx) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }

    const userWithRelations = await strapi.entityService.findOne(userUid, user.id, {
      populate: ['role', 'arts', 'created_arts'],
    });

    ctx.send(sanitizeUser(userWithRelations, ctx));
  };

  plugin.controllers.user.updateme = async (ctx) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }

    const body = ctx.request.body || {};
    const data = body.data || body;
    const { artId } = data;

    const userWithArts = await strapi.entityService.findOne(userUid, user.id, {
      populate: ['arts'],
    });

    const art = await strapi.entityService.findOne('api::art.art', artId);

    const existingIds = (userWithArts.arts || []).map((item) => item.id);
    const nextIds = existingIds.includes(art.id)
      ? existingIds.filter((id) => id !== art.id)
      : existingIds.concat(art.id);

    const updated = await strapi.entityService.update(userUid, user.id, {
      data: { arts: nextIds },
    });

    ctx.send(sanitizeUser(updated, ctx));
  };

  plugin.services.user.fetchAuthenticatedUser = (id) => {
    return strapi.entityService.findOne(userUid, id, {
      populate: ['role', 'arts'],
    });
  };

  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/me',
    handler: 'user.updateme',
    config: {
      policies: [],
    },
  });

  return plugin;
};
