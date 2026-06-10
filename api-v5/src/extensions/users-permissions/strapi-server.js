const { sanitize } = require('@strapi/utils');

const userUid = 'plugin::users-permissions.user';

module.exports = (plugin) => {
  // Existing relations
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

  // New fields for onboarding
  plugin.contentTypes.user.schema.attributes.phone = {
    type: 'string',
    unique: true,
  };
  plugin.contentTypes.user.schema.attributes.real_email = {
    type: 'string',
  };
  plugin.contentTypes.user.schema.attributes.pending_artist = {
    type: 'relation',
    relation: 'manyToOne',
    target: 'api::artist.artist',
  };
  plugin.contentTypes.user.schema.attributes.artist_confirmed = {
    type: 'boolean',
    default: false,
  };

  const sanitizeUser = (user, ctx) =>
    sanitize.contentAPI.output(user, strapi.getModel(userUid), { auth: ctx.state.auth });

  plugin.controllers.user.me = async (ctx) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }
    const userWithRelations = await strapi.entityService.findOne(userUid, user.id, {
      populate: ['role', 'arts', 'created_arts', 'pending_artist'],
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

  plugin.controllers.user.setphone = async (ctx) => {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const { phone } = ctx.request.body?.data || ctx.request.body || {};
    if (!phone) return ctx.badRequest('phone required');
    try {
      await strapi.entityService.update(userUid, user.id, { data: { phone } });
      ctx.send({ ok: true });
    } catch (e) {
      ctx.badRequest(e.message);
    }
  };

  plugin.controllers.user.setrealemail = async (ctx) => {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const { email } = ctx.request.body?.data || ctx.request.body || {};
    if (!email) return ctx.badRequest('email required');
    await strapi.entityService.update(userUid, user.id, { data: { real_email: email } });
    ctx.send({ ok: true });
  };

  plugin.controllers.user.claimartist = async (ctx) => {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const { artistId } = ctx.request.body?.data || ctx.request.body || {};
    if (!artistId) return ctx.badRequest('artistId required');
    await strapi.entityService.update(userUid, user.id, {
      data: { pending_artist: artistId, artist_confirmed: false },
    });
    ctx.send({ ok: true });
  };

  plugin.services.user.fetchAuthenticatedUser = (id) => {
    return strapi.entityService.findOne(userUid, id, {
      populate: ['role', 'arts', 'pending_artist'],
    });
  };

  plugin.routes['content-api'].routes.push(
    { method: 'PUT', path: '/users/me', handler: 'user.updateme', config: { policies: [] } },
    { method: 'POST', path: '/users/me/set-phone', handler: 'user.setphone', config: { policies: [] } },
    { method: 'POST', path: '/users/me/set-email', handler: 'user.setrealemail', config: { policies: [] } },
    { method: 'POST', path: '/users/me/claim-artist', handler: 'user.claimartist', config: { policies: [] } },
  );

  return plugin;
};
