// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    if (process.env.IMPORT_V3_DUMP === 'true') {
      const { default: importV3Dump } = await import('./utils/import-v3-dump');
      await importV3Dump(strapi);
    }

    const ensurePublicUploadPermissions = async () => {
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });
      if (!role) return;

      const actions = [
        'plugin::upload.content-api.find',
        'plugin::upload.content-api.findOne',
      ];

      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findMany({
          where: {
            role: role.id,
            action: { $in: actions },
          },
          select: ['action'],
        });

      const existingActions = new Set((existing || []).map((item) => item.action));
      const missing = actions.filter((action) => !existingActions.has(action));

      await Promise.all(
        missing.map((action) =>
          strapi.db.query('plugin::users-permissions.permission').create({
            data: {
              action,
              role: role.id,
            },
          })
        )
      );
    };

    await ensurePublicUploadPermissions();

    const ensureAuthenticatedPermissions = async () => {
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });
      if (!role) return;

      const actions = [
        'plugin::users-permissions.user.setphone',
        'plugin::users-permissions.user.setrealemail',
        'plugin::users-permissions.user.claimartist',
      ];

      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findMany({
          where: { role: role.id, action: { $in: actions } },
          select: ['action'],
        });

      const existingActions = new Set((existing || []).map((item: any) => item.action));
      const missing = actions.filter((action) => !existingActions.has(action));

      await Promise.all(
        missing.map((action) =>
          strapi.db.query('plugin::users-permissions.permission').create({
            data: { action, role: role.id },
          })
        )
      );
    };

    await ensureAuthenticatedPermissions();

    const registerUserRoutes = () => {
      const jwtService = strapi.plugins['users-permissions'].services.jwt;
      const userUid = 'plugin::users-permissions.user';

      const withAuth = async (ctx: any, next: () => Promise<void>) => {
        const raw = ctx.request.headers.authorization || '';
        const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
        if (!token) { ctx.status = 401; ctx.body = { error: 'Unauthorized' }; return; }
        try {
          const { id } = await jwtService.verify(token);
          const user = await strapi.entityService.findOne(userUid, id, {});
          if (!user) { ctx.status = 401; ctx.body = { error: 'Unauthorized' }; return; }
          ctx.state.user = user;
          return next();
        } catch {
          ctx.status = 401; ctx.body = { error: 'Unauthorized' }; return;
        }
      };

      strapi.server.router.post('/api/users/me/set-phone', withAuth, async (ctx: any) => {
        const { phone } = ctx.request.body || {};
        if (!phone) { ctx.status = 400; ctx.body = { error: 'phone required' }; return; }
        try {
          await strapi.entityService.update(userUid, ctx.state.user.id, { data: { phone } });
          ctx.body = { ok: true };
        } catch (e: any) {
          ctx.status = 400; ctx.body = { error: e.message };
        }
      });

      strapi.server.router.post('/api/users/me/set-email', withAuth, async (ctx: any) => {
        const { email } = ctx.request.body || {};
        if (!email) { ctx.status = 400; ctx.body = { error: 'email required' }; return; }
        await strapi.entityService.update(userUid, ctx.state.user.id, { data: { real_email: email } });
        ctx.body = { ok: true };
      });

      strapi.server.router.post('/api/users/me/claim-artist', withAuth, async (ctx: any) => {
        const { artistId } = ctx.request.body || {};
        if (!artistId) { ctx.status = 400; ctx.body = { error: 'artistId required' }; return; }
        await strapi.entityService.update(userUid, ctx.state.user.id, {
          data: { pending_artist: artistId, artist_confirmed: false },
        });
        ctx.body = { ok: true };
      });
    };

    registerUserRoutes();

    const ensureUploadFilesPublished = async () => {
      const now = new Date().toISOString();
      await strapi.db.query('plugin::upload.file').updateMany({
        where: { publishedAt: null },
        data: { publishedAt: now },
      });
    };

    await ensureUploadFilesPublished();

    if (process.env.REGENERATE_UPLOAD_FORMATS === 'true') {
      const { default: regenerateUploadFormats } = await import(
        './utils/regenerate-upload-formats'
      );
      await regenerateUploadFormats(strapi);
    }

  },
};
