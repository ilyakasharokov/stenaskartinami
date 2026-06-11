import { sanitize } from '@strapi/utils';
import { factories } from '@strapi/strapi';

const uid = 'api::art.art';

// Published entity IDs come from the content API (default).
// Draft arts must reference draft entity IDs so Strapi admin resolves them correctly.
async function toDraftId(table: string, id: number): Promise<number> {
  if (!id) return id;
  const rows = await strapi.db.connection.raw(
    `SELECT d.id FROM ${table} d
     JOIN ${table} p ON d.document_id = p.document_id
     WHERE p.id = :id AND d.published_at IS NULL
     LIMIT 1`,
    { id }
  );
  return rows.rows?.[0]?.id ?? id;
}

async function mapToDraftIds(data: any) {
  const relMap: Record<string, string> = {
    Artist: 'artists',
    styles: 'styles',
    subjects: 'subjects',
    mediums: 'mediums',
  };
  for (const [field, table] of Object.entries(relMap)) {
    if (data[field] === undefined) continue;
    if (Array.isArray(data[field])) {
      data[field] = await Promise.all(data[field].map((id: number) => toDraftId(table, id)));
    } else if (typeof data[field] === 'number') {
      data[field] = await toDraftId(table, data[field]);
    }
  }
}

const sanitizeOutput = (data: any, ctx: any) => {
  const sanitizer = (sanitize as any).contentAPI?.output;
  return sanitizer ? sanitizer(data, strapi.getModel(uid), { auth: ctx.state.auth }) : data;
};

const defaultPopulate = {
  Artist: true,
  styles: true,
  subjects: true,
  mediums: true,
  wall: true,
  Pictures: true,
  video: true,
  user_uploader: true,
};

const mergePopulate = (populate: any) => {
  if (!populate) return defaultPopulate;
  if (populate === '*') return populate;
  if (Array.isArray(populate)) {
    const defaults = Object.keys(defaultPopulate);
    return Array.from(new Set([...populate, ...defaults]));
  }
  if (typeof populate === 'object') {
    return { ...defaultPopulate, ...populate };
  }
  return populate;
};

export default factories.createCoreController(uid, () => ({
  async find(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const { results, pagination } = await strapi.service(uid).find({
      ...sanitizedQuery,
      populate: mergePopulate(sanitizedQuery.populate),
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
        filters: { ...baseFilters, documentId: { $eq: id } } as any,
        populate: mergePopulate(sanitizedQuery.populate),
        pagination: { pageSize: 1, page: 1 },
      });
      entity = Array.isArray(results) ? results[0] : results;
    }
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async filter(ctx) {
    const styles = ctx.query.styles;
    if (!styles) {
      return [];
    }

    const slugs = Array.isArray(styles) ? styles : [styles];
    const entities = await strapi.entityService.findMany(uid, {
      status: 'published',
      filters: {
        styles: {
          slug: { $in: slugs },
        },
      },
      populate: {
        Artist: true,
        styles: true,
        subjects: true,
        mediums: true,
        wall: true,
        Pictures: true,
        video: true,
      },
      pagination: { pageSize: 10000 },
    });

    return sanitizeOutput(entities, ctx);
  },

  async allArts(ctx) {
    const entities = await strapi.entityService.findMany(uid, {
      status: 'published',
      populate: {
        Artist: true,
        styles: true,
        subjects: true,
        mediums: true,
        wall: true,
        Pictures: true,
        video: true,
      },
      pagination: { pageSize: 10000 },
    });

    return sanitizeOutput(entities, ctx);
  },

  async count(ctx) {
    const filters = ctx.query?.filters || {};
    const total = await strapi.entityService.count(
      uid,
      { filters, status: 'published' } as any
    );
    return { count: total };
  },

  async findOneAll(ctx) {
    const { id } = ctx.params;
    const populate = {
      Artist: true,
      styles: true,
      subjects: true,
      mediums: true,
      wall: true,
      Pictures: true,
      video: true,
      user_uploader: true,
    };
    let entity = null;
    if (/^\d+$/.test(id)) {
      const results = await strapi.entityService.findMany(uid, {
        status: 'published',
        filters: { id: { $eq: Number(id) } } as any,
        populate,
        pagination: { pageSize: 1, page: 1 },
      });
      entity = Array.isArray(results) ? results[0] : results;
    } else {
      const results = await strapi.entityService.findMany(uid, {
        status: 'published',
        filters: { documentId: { $eq: id } } as any,
        populate,
        pagination: { pageSize: 1, page: 1 },
      });
      entity = Array.isArray(results) ? results[0] : results;
    }

    return sanitizeOutput(entity, ctx);
  },

  async create(ctx) {
    const userId = ctx.state.user?.id;

    // Map published entity IDs → draft entity IDs for relations
    const body = ctx.request.body || {};
    const data = body.data || {};
    await mapToDraftIds(data);
    ctx.request.body = { ...body, data };

    const response = await super.create(ctx);
    const createdId = response.data?.id;

    if (createdId) {
      try {
        if (userId) {
          await strapi.entityService.update(uid, createdId, {
            data: { user_uploader: userId } as any,
          });
        }
        const entity = await strapi.entityService.findOne(uid, createdId, {
          populate: { Artist: true },
        });
        await strapi.plugin('email').service('email').send({
          to: 'ilyakasharokov@mail.ru, dudkinet@gmail.com',
          from: 'no-reply@stenaskartinami.com',
          subject: 'Стена с картинами, новая картина на модерации',
          text: `Форма: "Новая картина"\nНазвание: ${(entity as any)?.Title || ''}\nХудожник: ${(entity as any)?.Artist?.full_name || ''}`,
        });
      } catch (error) {
        strapi.log.error(error);
      }
    }

    return response;
  },

  async createD(ctx) {
    const body = ctx.request.body || {};
    const data = body.data || body;

    const entity = await strapi.entityService.create(uid, {
      data: {
        ...data,
        publishedAt: null,
      },
    });

    try {
      const entityWithRelations = await strapi.entityService.findOne(uid, entity.id, {
        populate: { Artist: true },
      });

      await strapi.plugin('email').service('email').send({
        to: 'ilyakasharokov@mail.ru, dudkinet@gmail.com',
        from: 'no-reply@stenaskartinami.com',
        subject: 'Стена с картинами, новая картина на модерации',
        text: `
          Форма: "Новая картина",
          Имя: ${entityWithRelations?.Title || ''}
          Художник: ${(entityWithRelations as any)?.Artist?.full_name || ''}
        `,
      });
    } catch (error) {
      strapi.log.error(error);
    }

    return sanitizeOutput(entity, ctx);
  },
}));
