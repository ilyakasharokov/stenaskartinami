'use strict';

const { sanitize } = require('@strapi/utils');
const { createCoreController } = require('@strapi/strapi').factories;

const uid = 'api::form.form';

const sanitizeOutput = (data, ctx) =>
  sanitize.contentAPI.output(data, strapi.getModel(uid), { auth: ctx.state.auth });

module.exports = createCoreController(uid, ({ strapi }) => ({
  async create(ctx) {
    const body = ctx.request.body || {};
    const data = body.data || body;

    const entity = await strapi.entityService.create(uid, { data });

    try {
      await strapi.plugin('email').service('email').send({
        to: 'ilyakasharokov@mail.ru, dudkinet@gmail.com',
        from: 'no-reply@stenaskartinami.com',
        subject: 'Стена с картинами, заявка YO',
        text: `
          Форма: ${entity?.title || ''}
          Имя: ${entity?.name || ''}
          Почта: ${entity?.email || ''}
          Сообщение: ${entity?.text || ''}
        `,
      });
    } catch (error) {
      strapi.log.error(error);
    }

    return sanitizeOutput(entity, ctx);
  },

  async count(ctx) {
    const filters = ctx.query?.filters || {};
    const total = await strapi.entityService.count(uid, { filters });
    return { count: total };
  },
}));
