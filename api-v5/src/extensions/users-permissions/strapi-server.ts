/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sanitize } = require('@strapi/utils') as any;

declare const strapi: any;

const userUid = 'plugin::users-permissions.user';

const CUSTOM_ACTIONS = ['me', 'setphone', 'setrealemail', 'claimartist', 'toggleart', 'myprofile', 'updateprofile'];

export default (plugin: any) => {
  plugin.contentTypes.user.schema.attributes.isModerator = {
    type: 'boolean',
    default: false,
  };

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
  plugin.contentTypes.user.schema.attributes.bio = { type: 'text' };
  plugin.contentTypes.user.schema.attributes.location = { type: 'string' };
  plugin.contentTypes.user.schema.attributes.website = { type: 'string' };
  plugin.contentTypes.user.schema.attributes.instagram = { type: 'string' };
  plugin.contentTypes.user.schema.attributes.telegram_handle = { type: 'string' };
  plugin.contentTypes.user.schema.attributes.cover_image = {
    type: 'media', multiple: false, required: false, allowedTypes: ['images'],
  };
  plugin.contentTypes.user.schema.attributes.profile_image = {
    type: 'media', multiple: false, required: false, allowedTypes: ['images'],
  };

  // Wrap the user controller factory so custom methods appear in the returned instance.
  // Strapi's syncPermissions inspects _.keys(factory({ strapi })), so methods added directly
  // to the factory function (not its return value) are invisible and get pruned from the DB.
  const originalFactory = plugin.controllers.user;
  plugin.controllers.user = ({ strapi: s }) => {
    const instance = (typeof originalFactory === 'function' ? originalFactory({ strapi: s }) : { ...originalFactory });

    instance.me = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
      const data = await s.entityService.findOne(userUid, user.id, {
        populate: ['role', 'arts', 'created_arts', 'pending_artist'],
      });
      ctx.send(sanitize.contentAPI.output(data, s.getModel(userUid), { auth: ctx.state.auth }));
    };

    instance.myprofile = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const data = await s.entityService.findOne(userUid, user.id, { populate: ['role', 'pending_artist', 'cover_image', 'profile_image'] });
      const artRows = await s.db.connection('up_users_arts_lnk')
        .where({ user_id: user.id })
        .orderBy('art_ord')
        .select('art_id');
      data.arts = artRows.map((r: any) => ({ id: r.art_id }));
      ctx.send(data);
    };

    instance.setphone = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const { phone } = ctx.request.body?.data || ctx.request.body || {};
      if (!phone) return ctx.badRequest('phone required');
      try {
        await s.entityService.update(userUid, user.id, { data: { phone } });
        ctx.send({ ok: true });
      } catch (e) {
        ctx.badRequest(e.message);
      }
    };

    instance.setrealemail = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const { email } = ctx.request.body?.data || ctx.request.body || {};
      if (!email) return ctx.badRequest('email required');
      await s.entityService.update(userUid, user.id, { data: { real_email: email } });
      ctx.send({ ok: true });
    };

    instance.claimartist = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const { artistId } = ctx.request.body?.data || ctx.request.body || {};
      if (!artistId) return ctx.badRequest('artistId required');
      await s.entityService.update(userUid, user.id, {
        data: { pending_artist: artistId, artist_confirmed: false },
      });
      ctx.send({ ok: true });
    };

    instance.updateprofile = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const body = ctx.request.body?.data || ctx.request.body || {};
      const allowed = ['username', 'bio', 'location', 'website', 'instagram', 'telegram_handle', 'cover_image', 'profile_image'];
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (key in body) data[key] = body[key];
      }
      if (Object.keys(data).length === 0) return ctx.badRequest('No fields to update');
      await s.entityService.update(userUid, user.id, { data });
      ctx.send({ ok: true });
    };

    instance.toggleart = async (ctx) => {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const { artId } = ctx.request.body?.data || ctx.request.body || {};
      if (!artId) return ctx.badRequest('artId required');
      const numericId = Number(artId);
      const db = s.db.connection;
      const rows = await db('up_users_arts_lnk').where({ user_id: user.id }).select('art_id');
      const existingIds: number[] = rows.map((r: any) => r.art_id);
      const isFavorite = existingIds.includes(numericId);
      if (isFavorite) {
        await db('up_users_arts_lnk').where({ user_id: user.id, art_id: numericId }).delete();
      } else {
        const maxOrd = rows.length > 0 ? Math.max(...rows.map((r: any) => r.art_ord || 0)) : 0;
        await db('up_users_arts_lnk').insert({ user_id: user.id, art_id: numericId, art_ord: maxOrd + 1 });
      }
      const nextIds = isFavorite ? existingIds.filter(id => id !== numericId) : [...existingIds, numericId];
      ctx.send({ arts: nextIds, isFavorite: !isFavorite });
    };

    return instance;
  };

  plugin.services.user.fetchAuthenticatedUser = (id) => {
    return strapi.entityService.findOne(userUid, id, {
      populate: ['role', 'arts', 'pending_artist'],
    });
  };

  plugin.routes['content-api'].routes.push(
    { method: 'GET',  path: '/users/me/profile',        handler: 'user.myprofile',      config: { prefix: '', policies: [] } },
    { method: 'PUT',  path: '/users/me/profile',        handler: 'user.updateprofile',  config: { prefix: '', policies: [] } },
    { method: 'POST', path: '/users/me/toggle-art',     handler: 'user.toggleart',      config: { prefix: '', policies: [] } },
    { method: 'POST', path: '/users/me/set-phone',      handler: 'user.setphone',       config: { prefix: '', policies: [] } },
    { method: 'POST', path: '/users/me/set-email',      handler: 'user.setrealemail',   config: { prefix: '', policies: [] } },
    { method: 'POST', path: '/users/me/claim-artist',   handler: 'user.claimartist',    config: { prefix: '', policies: [] } },
  );

  // Ensure custom permissions exist after syncPermissions runs.
  const originalBootstrap = plugin.bootstrap;
  plugin.bootstrap = async ({ strapi: s }) => {
    if (originalBootstrap) await originalBootstrap({ strapi: s });

    const authRole = await s.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
    if (!authRole) return;

    for (const action of CUSTOM_ACTIONS) {
      const fullAction = `plugin::users-permissions.user.${action}`;
      const existing = await s.db.query('plugin::users-permissions.permission').findOne({ where: { action: fullAction } });
      if (!existing) {
        await s.db.query('plugin::users-permissions.permission').create({
          data: { action: fullAction, role: authRole.id },
        });
      }
    }
  };

  return plugin;
};
