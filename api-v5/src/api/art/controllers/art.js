'use strict';

const { sanitize } = require('@strapi/utils');
const { createCoreController } = require('@strapi/strapi').factories;

const uid = 'api::art.art';

const sanitizeOutput = (data, ctx) =>
  sanitize.contentAPI.output(data, strapi.getModel(uid), { auth: ctx.state.auth });

module.exports = createCoreController(uid, ({ strapi }) => ({
  async filter(ctx) {
    const styles = ctx.query.styles;
    if (!styles) {
      return [];
    }

    const slugs = Array.isArray(styles) ? styles : [styles];
    const entities = await strapi.entityService.findMany(uid, {
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
    const total = await strapi.entityService.count(uid, { filters });
    return { count: total };
  },

  async findOneAll(ctx) {
    const { id } = ctx.params;
    const entity = await strapi.entityService.findOne(uid, id, {
      populate: {
        Artist: true,
        styles: true,
        subjects: true,
        mediums: true,
        wall: true,
        Pictures: true,
        video: true,
        user_uploader: true,
      },
    });

    return sanitizeOutput(entity, ctx);
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
          Художник: ${entityWithRelations?.Artist?.full_name || ''}
        `,
      });
    } catch (error) {
      strapi.log.error(error);
    }

    return sanitizeOutput(entity, ctx);
  },
}));
