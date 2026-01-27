import { sanitize } from '@strapi/utils';
import { factories } from '@strapi/strapi';

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
    return this.transformResponse(sanitizedEntity);
  },
}));
