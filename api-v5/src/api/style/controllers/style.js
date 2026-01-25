'use strict';

const { sanitize } = require('@strapi/utils');
const { createCoreController } = require('@strapi/strapi').factories;

const uid = 'api::style.style';

const sanitizeOutput = (data, ctx) =>
  sanitize.contentAPI.output(data, strapi.getModel(uid), { auth: ctx.state.auth });

module.exports = createCoreController(uid, ({ strapi }) => ({
  async filters(ctx) {
    const filters = {
      styles: [],
      subjects: [],
      mediums: [],
    };

    const sources = [
      { key: 'styles', uid: 'api::style.style' },
      { key: 'subjects', uid: 'api::subject.subject' },
      { key: 'mediums', uid: 'api::medium.medium' },
    ];

    for (const source of sources) {
      filters[source.key] = await strapi.entityService.findMany(source.uid, {
        pagination: { pageSize: 10000 },
      });
    }

    return filters;
  },

  async count(ctx) {
    const filters = ctx.query?.filters || {};
    const total = await strapi.entityService.count(uid, { filters });
    return { count: total };
  },
}));
