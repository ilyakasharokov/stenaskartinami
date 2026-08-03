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
        'api::art.art.findmy',
        'api::art.art.findmyone',
        'api::wall.wall.findmy',
        'api::wall.wall.findMy',
        'api::wall.wall.create',
        'api::wall.wall.update',
        'api::art.art.createDraft',
        'api::artist.artist.find',
        'api::artist.artist.findOne',
        'api::artist.artist.create',
        'api::artist.artist.follow',
        'api::artist.artist.unfollow',
        'api::artist.artist.adminUpdate',
        'api::mail-log.mail-log.sendCampaign',
        'api::mail-log.mail-log.logs',
        'api::mail-log.mail-log.refreshScores',
        'api::art.art.moderation',
        'api::art.art.reject',
        'api::art.art.approve',
        'api::art.art.delete',
        'plugin::upload.content-api.upload',
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

    const backfillLikesCount = async () => {
      try {
        const client = strapi.db.connection.client.config.client || '';
        if (['pg', 'postgres', 'postgresql'].some((c) => client.includes(c))) {
          // New columns arrive as NULL for existing rows; Postgres sorts NULLs
          // first in DESC, which breaks popularity sorting — normalize to 0.
          await strapi.db.connection.raw(`UPDATE arts SET likes_count = 0 WHERE likes_count IS NULL`);
          await strapi.db.connection.raw(`UPDATE arts SET views = 0 WHERE views IS NULL`);
          await strapi.db.connection.raw(`
            UPDATE arts a
            SET likes_count = COALESCE(sub.cnt, 0)
            FROM (
              SELECT p.document_id AS doc, COUNT(l.art_id) AS cnt
              FROM up_users_arts_lnk l
              JOIN arts p ON p.id = l.art_id
              GROUP BY p.document_id
            ) sub
            WHERE a.document_id = sub.doc
              AND a.likes_count IS DISTINCT FROM sub.cnt
          `);
        }
      } catch (e: any) {
        strapi.log.warn('[bootstrap] backfillLikesCount failed: ' + e.message);
      }
    };

    await backfillLikesCount();

    if (process.env.REGENERATE_UPLOAD_FORMATS === 'true') {
      const { default: regenerateUploadFormats } = await import(
        './utils/regenerate-upload-formats'
      );
      await regenerateUploadFormats(strapi);
    }

  },
};
