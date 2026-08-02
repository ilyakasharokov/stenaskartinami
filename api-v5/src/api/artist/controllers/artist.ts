import { sanitize } from '@strapi/utils';
import { factories } from '@strapi/strapi';
import { meiliSync } from '../../../meili/client';

const uid = 'api::artist.artist';
const userUid = 'plugin::users-permissions.user';
const artUid = 'api::art.art';

const sanitizeOutput = (data: any, ctx: any) => {
  const sanitizer = (sanitize as any).contentAPI?.output;
  return sanitizer ? sanitizer(data, strapi.getModel(uid), { auth: ctx.state.auth }) : data;
};

const mergePopulate = (populate: any) => {
  if (!populate) return populate;
  if (populate === '*') return populate;
  if (Array.isArray(populate)) return populate;
  if (typeof populate === 'object') return populate;
  return populate;
};

const findPublishedByDocumentId = async (documentId: string) => {
  const results = await strapi.entityService.findMany(uid, {
    filters: { documentId: { $eq: documentId } } as any,
    status: 'published',
    pagination: { pageSize: 1 },
  });
  return Array.isArray(results) ? results[0] : null;
};

const computeStats = async (entity: any, userId?: number) => {
  const followersRow = await strapi.db.query(uid).findOne({
    where: { id: entity.id },
    populate: ['followers'],
  });
  const followers = followersRow?.followers || [];

  const arts = await strapi.entityService.findMany(artUid, {
    filters: { Artist: { documentId: { $eq: entity.documentId } } } as any,
    populate: { wall: true } as any,
    fields: ['id', 'sold', 'views', 'likes_count'] as any,
    status: 'published',
    pagination: { pageSize: 1000 },
  });
  const artsList = Array.isArray(arts) ? arts : [];

  const wallIds = new Set(
    artsList.map((a: any) => a.wall?.documentId).filter(Boolean)
  );

  return {
    followersCount: followers.length,
    worksCount: artsList.length,
    soldCount: artsList.filter((a: any) => a.sold).length,
    wallsCount: wallIds.size,
    totalViews: artsList.reduce((s: number, a: any) => s + (a.views || 0), 0),
    totalLikes: artsList.reduce((s: number, a: any) => s + (a.likes_count || 0), 0),
    isFollowing: userId ? followers.some((f: any) => f.id === userId) : false,
  };
};

export default factories.createCoreController(uid, () => ({
  async find(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const { results, pagination } = await strapi.service(uid).find({
      ...sanitizedQuery,
      populate: mergePopulate(sanitizedQuery.populate),
      status: sanitizedQuery.status || 'published',
    });
    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    let entity = null;
    if (/^\d+$/.test(id)) {
      const results = await strapi.entityService.findMany(uid, {
        ...sanitizedQuery,
        status: sanitizedQuery.status || 'published',
        filters: { id: { $eq: Number(id) } } as any,
        populate: mergePopulate(sanitizedQuery.populate),
        pagination: { pageSize: 1, page: 1 },
      });
      entity = Array.isArray(results) ? results[0] : results;
    } else {
      const baseFilters =
        sanitizedQuery.filters &&
        typeof sanitizedQuery.filters === 'object' &&
        !Array.isArray(sanitizedQuery.filters)
          ? sanitizedQuery.filters
          : {};
      const { results } = await strapi.service(uid).find({
        ...sanitizedQuery,
        status: sanitizedQuery.status || 'published',
        filters: { ...baseFilters, documentId: { $eq: id } } as any,
        populate: mergePopulate(sanitizedQuery.populate),
        pagination: { pageSize: 1, page: 1 },
      });
      entity = Array.isArray(results) ? results[0] : results;
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    if (sanitizedEntity) {
      const stats = await computeStats(entity, ctx.state.user?.id);
      Object.assign(sanitizedEntity, stats);
    }
    return this.transformResponse(sanitizedEntity);
  },

  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }

    if (ctx.request.body?.data) {
      delete ctx.request.body.data.user_uploader;
      delete ctx.request.body.data.followers;
      delete ctx.request.body.data.slug;
    }

    const profileType = ctx.request.body?.data?.profile_type || 'real_user';

    if (profileType === 'real_user') {
      const user: any = await strapi.db.query(userUid).findOne({
        where: { id: userId },
        populate: ['pending_artist'],
      });
      if (user?.pending_artist && user?.artist_confirmed) {
        ctx.status = 400;
        ctx.body = { error: { status: 400, message: 'У вас уже есть профиль художника' } };
        return;
      }
    }

    const response = await super.create(ctx);

    const documentId = response?.data?.documentId;
    if (documentId) {
      await strapi.documents(uid).update({
        documentId,
        data: { user_uploader: userId } as any,
      });
      await strapi.documents(uid).publish({ documentId });

      const published = await findPublishedByDocumentId(documentId);

      meiliSync('artist', documentId);

      if (profileType === 'real_user' && published) {
        await strapi.entityService.update(userUid, userId, {
          data: { pending_artist: published.id, artist_confirmed: true } as any,
        });
      }

      if (published) {
        const sanitized = await this.sanitizeOutput(published, ctx);
        return this.transformResponse(sanitized);
      }
    }

    return response;
  },

  async follow(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }
    const documentId = ctx.params.id;
    const artist = await findPublishedByDocumentId(documentId);
    if (!artist) {
      ctx.status = 404;
      ctx.body = { error: { status: 404, message: 'Not found' } };
      return;
    }

    await strapi.db.query(uid).update({
      where: { id: artist.id },
      data: { followers: { connect: [userId] } } as any,
    });

    const stats = await computeStats(artist, userId);
    ctx.body = { followersCount: stats.followersCount, isFollowing: true };

    // Notify artist owner (non-blocking)
    setImmediate(async () => {
      try {
        const fullArtist = await strapi.db.query(uid).findOne({
          where: { id: artist.id },
          populate: ['user_uploader'],
        });
        if (!fullArtist?.user_uploader?.id || fullArtist.user_uploader.id === userId) return;
        const follower = await strapi.entityService.findOne(userUid, userId, { fields: ['username', 'name'] as any } as any);
        const actorName = (follower as any)?.name || (follower as any)?.username || 'Пользователь';
        await strapi.db.query('api::notification.notification').create({
          data: {
            type: 'new_follower',
            recipient_id: fullArtist.user_uploader.id,
            actor_name: actorName,
            body: 'подписался на вас',
            link: `/artists/${artist.slug || artist.documentId}--${artist.id}`,
            image_url: null,
            read: false,
          },
        });
      } catch (e) { /* non-critical */ }
    });
  },

  async adminUpdate(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const userRecord = await strapi.entityService.findOne(userUid, user.id, {}) as any;
    if (!(userRecord?.isModerator ?? userRecord?.is_moderator)) return ctx.forbidden('Not a moderator');

    const documentId = ctx.params.id;
    const artist = await findPublishedByDocumentId(documentId);
    if (!artist) return ctx.notFound();

    const ALLOWED = ['full_name', 'description', 'country', 'city_name', 'birth_year',
      'career_start_year', 'directions', 'techniques', 'subjects', 'education',
      'exhibitions', 'social_links', 'studio_location', 'nickname'];
    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const data: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(body, key)) data[key] = body[key];
    }

    await strapi.entityService.update(uid, artist.id, { data } as any);
    meiliSync('artist', documentId);
    ctx.body = { ok: true };
  },

  async unfollow(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }
    const documentId = ctx.params.id;
    const artist = await findPublishedByDocumentId(documentId);
    if (!artist) {
      ctx.status = 404;
      ctx.body = { error: { status: 404, message: 'Not found' } };
      return;
    }

    await strapi.db.query(uid).update({
      where: { id: artist.id },
      data: { followers: { disconnect: [userId] } } as any,
    });

    const stats = await computeStats(artist, userId);
    ctx.body = { followersCount: stats.followersCount, isFollowing: false };
  },
}));
