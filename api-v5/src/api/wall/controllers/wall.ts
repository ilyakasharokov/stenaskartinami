import { sanitize } from '@strapi/utils';
import { factories } from '@strapi/strapi';
import { meiliSync } from '../../../meili/client';

const uid = 'api::wall.wall';

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

export default factories.createCoreController(uid, ({ strapi }) => ({
  async findMy(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }

    const queryOpts = {
      filters: { user_uploader: { id: { $eq: userId } } } as any,
      populate: { Images: true } as any,
      pagination: { pageSize: 100 },
      sort: { createdAt: 'desc' },
    };

    const [published, drafts] = await Promise.all([
      strapi.entityService.findMany(uid, { ...queryOpts, status: 'published' } as any),
      strapi.entityService.findMany(uid, { ...queryOpts, status: 'draft' } as any),
    ]);

    const publishedDocIds = new Set(
      (Array.isArray(published) ? published : []).map((w: any) => w.documentId)
    );

    const allWalls = [
      ...(Array.isArray(published) ? published : []).map((w: any) => ({ ...w, wallStatus: 'published' })),
      ...(Array.isArray(drafts) ? drafts : [])
        .filter((w: any) => !publishedDocIds.has(w.documentId))
        .map((w: any) => ({ ...w, wallStatus: 'draft' })),
    ];

    const sanitized = await this.sanitizeOutput(allWalls, ctx);
    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }
    if (ctx.request.body?.data) {
      delete ctx.request.body.data.user_uploader;
    }
    const documentId = ctx.params.id;
    const owns = await strapi.entityService.findMany(uid, {
      filters: {
        documentId: { $eq: documentId },
        user_uploader: { id: { $eq: userId } },
      } as any,
      pagination: { pageSize: 1 },
    } as any);
    if (!Array.isArray(owns) || owns.length === 0) {
      ctx.status = 403;
      ctx.body = { error: { status: 403, message: 'Forbidden' } };
      return;
    }
    const response = await super.update(ctx);
    await strapi.documents(uid).publish({ documentId });
    meiliSync('wall', documentId);
    return response;
  },

  async create(ctx) {
    // Strip any client-supplied user_uploader to prevent spoofing
    if (ctx.request.body?.data) {
      delete ctx.request.body.data.user_uploader
    }

    const response = await super.create(ctx)

    // Attach the authenticated user after creation
    const userId = ctx.state.user?.id
    const documentId = response?.data?.documentId
    if (userId && documentId) {
      await strapi.documents(uid).update({
        documentId,
        data: { user_uploader: userId } as any,
      })
      await strapi.documents(uid).publish({ documentId })
      meiliSync('wall', documentId)
    }

    return response
  },

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
    return this.transformResponse(sanitizedEntity);
  },
}));
