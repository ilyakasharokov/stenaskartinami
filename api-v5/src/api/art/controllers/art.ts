import { sanitize } from '@strapi/utils';
import { factories } from '@strapi/strapi';
import { meiliSync, meiliRemove } from '../../../meili/client';
import { revalidateFront, artPaths } from '../../../utils/revalidate';

// Fetch an art (by documentId) with the fields needed for ISR paths and
// trigger on-demand revalidation of its art + artist pages.
async function revalidateArt(documentId: string) {
  if (!documentId) return;
  try {
    const rows = await strapi.entityService.findMany('api::art.art', {
      filters: { documentId: { $eq: documentId } } as any,
      populate: { Artist: { fields: ['slug', 'id'] } } as any,
      fields: ['slug', 'id'] as any,
      pagination: { pageSize: 1 },
    });
    const art = Array.isArray(rows) ? rows[0] : rows;
    if (art) revalidateFront(artPaths(art));
  } catch { /* non-critical */ }
}

const uid = 'api::art.art';

const MODERATION_RECIPIENTS = 'ilyakasharokov@mail.ru, dudkinet@gmail.com';

// Rich "new art on moderation" email. Re-fetches the entry with full relations
// so title/artist/etc. are always present (the entry is fresh at create time).
async function sendModerationEmail(documentId: string, fallbackId: number) {
  try {
    // Use the db.query layer (not entityService) — the Meilisearch document
    // middleware that wraps entityService throws "Invalid key" on our relation
    // field selection, which previously made this fetch return nothing and the
    // email arrive with empty fields. Full populate avoids selecting bad keys.
    const emailPopulate = {
      Artist: true, styles: true, subjects: true, mediums: true,
      user_uploader: true, Pictures: true,
    } as any;
    let art: any = null;
    if (documentId) {
      art = await strapi.db.query(uid).findOne({
        where: { documentId, publishedAt: { $notNull: true } } as any,
        populate: emailPopulate,
      });
    }
    if (!art && fallbackId) {
      art = await strapi.db.query(uid).findOne({ where: { id: fallbackId }, populate: emailPopulate });
    }
    if (!art) return;

    const tagNames = (arr: any[]) =>
      (Array.isArray(arr) ? arr : []).map((t) => t?.title || t?.title).filter(Boolean).join(', ') || '—';
    const u = art.user_uploader || {};
    const contact = [u.email, u.real_email, u.phone].filter(Boolean).join(', ') || '—';
    const dims = art.width && art.height ? `${art.width} × ${art.height} см` : '—';
    const price = art.Owners_price ? `${art.Owners_price} ₽` : 'не указана';
    const artUrl = art.slug ? `https://stenaskartinami.com/art/${art.slug}--${art.id}` : '—';

    const title = art.title || 'Без названия';
    const artist = art.Artist?.full_name || '—';

    const lines = [
      `Название: ${title}`,
      `Художник: ${artist}${art.Artist?.nickname ? ` (${art.Artist.nickname})` : ''}`,
      `Материалы и техника: ${art.Materials || '—'}`,
      `Размеры: ${dims}`,
      `Год: ${art.Year ? new Date(art.Year).getFullYear() : '—'}`,
      `Желаемая цена автора: ${price}`,
      `Стили: ${tagNames(art.styles)}`,
      `Теги: ${tagNames(art.subjects)}`,
      `Техника: ${tagNames(art.mediums)}`,
      `Загрузил: ${u.username || '—'} (${contact})`,
      `Описание: ${art.Description ? String(art.Description).replace(/<[^>]+>/g, '').slice(0, 500) : '—'}`,
      ``,
      `Работа: ${artUrl}`,
      `Модерация: https://stenaskartinami.com/moderator`,
      ``,
      `Не забудьте назначить стену и публичную цену при одобрении.`,
    ];

    await strapi.plugin('email').service('email').send({
      to: MODERATION_RECIPIENTS,
      from: 'no-reply@stenaskartinami.com',
      subject: `Новая работа на модерации: «${title}» — ${artist}`,
      text: lines.join('\n'),
    });
  } catch (error) {
    strapi.log.error('[art] sendModerationEmail failed:', error);
  }
}

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
  interior_photo: true,
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
      status: 'published',
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

  async findMyOne(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }
    const { documentId } = ctx.params;
    const results = await strapi.entityService.findMany(uid, {
      status: 'draft',
      filters: {
        documentId: { $eq: documentId },
        user_uploader: { id: { $eq: userId } },
      } as any,
      populate: {
        Artist: true, styles: true, subjects: true, mediums: true,
        wall: true, Pictures: true, user_uploader: true,
      },
      pagination: { pageSize: 1 },
    });
    const entity = Array.isArray(results) ? results[0] : results;
    if (!entity) {
      ctx.status = 404;
      ctx.body = { error: { status: 404, message: 'Not found' } };
      return;
    }
    const sanitized = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitized);
  },

  async findMy(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }

    const populate = {
      Artist: true,
      styles: true,
      subjects: true,
      mediums: true,
      wall: true,
      Pictures: true,
    };
    const filters = { user_uploader: { id: { $eq: userId } } } as any;
    const pagination = { pageSize: 200 };

    const [published, drafts] = await Promise.all([
      strapi.entityService.findMany(uid, { status: 'published', filters, populate, pagination }),
      strapi.entityService.findMany(uid, { status: 'draft', filters, populate, pagination }),
    ]);

    const publishedDocIds = new Set(
      (Array.isArray(published) ? published : []).map((e: any) => e.documentId)
    );
    const draftOnly = (Array.isArray(drafts) ? drafts : []).filter(
      (d: any) => !publishedDocIds.has(d.documentId)
    );

    const allArts = [
      ...(Array.isArray(published) ? published : []),
      ...draftOnly,
    ].sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const sanitizedResults = await this.sanitizeOutput(allArts, ctx);
    return this.transformResponse(sanitizedResults, { pagination: {} });
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
      interior_photo: true,
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
        await sendModerationEmail(response.data?.documentId, createdId);
      } catch (error) {
        strapi.log.error(error);
      }
      meiliSync('art', response.data?.documentId);
      revalidateArt(response.data?.documentId);
    }

    return response;
  },

  async createDraft(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: { status: 401, message: 'Unauthorized' } };
      return;
    }
    const body = ctx.request.body || {};
    const data = body.data || body;

    const entity = await strapi.entityService.create(uid, {
      data: { ...data, publishedAt: null } as any,
    });

    if (entity?.id) {
      await strapi.entityService.update(uid, entity.id, {
        data: { user_uploader: userId } as any,
      });
    }

    const sanitized = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitized);
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
          Имя: ${(entityWithRelations as any)?.title || ''}
          Художник: ${(entityWithRelations as any)?.Artist?.full_name || ''}
        `,
      });
    } catch (error) {
      strapi.log.error(error);
    }

    return sanitizeOutput(entity, ctx);
  },

  async moderation(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const userRecord = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {}) as any;
    if (!(userRecord?.isModerator ?? userRecord?.is_moderator)) return ctx.forbidden('Not a moderator');

    const { results, pagination } = await strapi.service(uid).find({
      status: 'published',
      filters: { wall: { id: { $null: true } } } as any,
      populate: { Pictures: true, Artist: true, user_uploader: true },
      sort: 'createdAt:desc',
      pagination: { pageSize: 50, page: Number(ctx.query.page) || 1 },
    });
    const sanitized = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitized, { pagination });
  },

  async reject(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const userRecord = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {}) as any;
    if (!(userRecord?.isModerator ?? userRecord?.is_moderator)) return ctx.forbidden('Not a moderator');

    const { id } = ctx.params;
    const results = await strapi.entityService.findMany(uid, {
      status: 'published',
      filters: { id: { $eq: Number(id) } } as any,
      pagination: { pageSize: 1 },
    });
    const entity = Array.isArray(results) ? results[0] : null;
    if (!entity) return ctx.notFound();

    await strapi.entityService.update(uid, entity.id, { data: { publishedAt: null } as any });
    meiliRemove('art', entity.id);
    revalidateArt((entity as any).documentId);
    ctx.send({ ok: true });
  },

  // POST /arts/:id/approve — moderator approves a work: attach the
  // "Картина свободна" placeholder wall so it becomes visible in the catalog.
  async approve(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const userRecord = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {}) as any;
    if (!(userRecord?.isModerator ?? userRecord?.is_moderator)) return ctx.forbidden('Not a moderator');

    const db = strapi.db.connection;
    const artRow = await db('arts').where({ id: Number(ctx.params.id) }).first('id', 'document_id');
    if (!artRow) return ctx.notFound();

    // placeholder wall "Картина свободна": published version for published arts,
    // draft version for draft arts (mirrors how existing arts are linked)
    const wPub = await db('walls').where({ slug: 'kartina-svobodna' }).whereNotNull('published_at').first('id');
    const wDraft = await db('walls').where({ slug: 'kartina-svobodna' }).whereNull('published_at').first('id');
    if (!wPub) return ctx.badRequest('Placeholder wall not found');

    // attach the wall to every version (draft + published) of this artwork
    const versions = await db('arts').where({ document_id: artRow.document_id }).select('id', 'published_at');
    for (const v of versions) {
      const wallId = v.published_at ? wPub.id : (wDraft?.id ?? wPub.id);
      await db('arts_wall_lnk').where({ art_id: v.id }).del();
      await db('arts_wall_lnk').insert({ art_id: v.id, wall_id: wallId, art_ord: 1 });
    }
    meiliSync('art', artRow.document_id);
    revalidateArt(artRow.document_id);
    ctx.send({ ok: true });
  },

  // DELETE /arts/:id — owner (or moderator) deletes their artwork
  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { id } = ctx.params;
    const rows = await strapi.entityService.findMany(uid, {
      filters: (/^\d+$/.test(id) ? { id: { $eq: Number(id) } } : { documentId: { $eq: id } }) as any,
      populate: { user_uploader: { fields: ['id'] }, Artist: { fields: ['slug', 'id'] } } as any,
      fields: ['slug', 'id', 'documentId'] as any,
      pagination: { pageSize: 1 },
    });
    const art: any = Array.isArray(rows) ? rows[0] : rows;
    if (!art) return ctx.notFound();

    const userRecord = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {}) as any;
    const isModerator = userRecord?.isModerator ?? userRecord?.is_moderator;
    const isOwner = art.user_uploader?.id === user.id;
    if (!isOwner && !isModerator) return ctx.forbidden('Not allowed to delete this artwork');

    const paths = artPaths(art);
    await strapi.documents(uid).delete({ documentId: art.documentId });
    meiliRemove('art', art.id);
    revalidateFront(paths);
    ctx.send({ ok: true });
  },

  // POST /arts/:id/view — increment view counter (deduped client-side)
  async incrementView(ctx) {
    const id = Number(ctx.params.id);
    if (!id) return ctx.badRequest('id required');

    const db = strapi.db.connection;
    try {
      const rows = await db('arts')
        .where({ id })
        .increment('views', 1)
        .returning(['views', 'document_id']);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return ctx.notFound();

      // Bump every version sharing this document_id so drafts stay in sync
      if (row.document_id) {
        await db('arts')
          .where({ document_id: row.document_id })
          .whereNot({ id })
          .update({ views: row.views });
      }
      ctx.send({ views: row.views });
    } catch (e: any) {
      strapi.log.warn('[art] incrementView failed: ' + e.message);
      ctx.send({ views: null });
    }
  },
}));
