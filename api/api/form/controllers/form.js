'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {};

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  async create(ctx) {
    let entity;console.log(ctx);
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.form.create(data, { files });
    } else {
	console.log(ctx.request)
      entity = await strapi.services.form.create(ctx.request.body);
    }

    entity = sanitizeEntity(entity, { model: strapi.models.form });

    
      // send an email by using the email plugin
      await strapi.plugins['email'].services.email.send({
        to: 'ilyakasharokov@mail.ru, dudkinet@gmail.com',
        from: 'no-reply@stenaskartinami.com',
        subject: 'На вас написали заявление',
        text: `
	  Форма: ${entity.title}
	  Имя: ${entity.name}
	  Почта: ${entity.email}
	  Сообщение: ${entity.text}
        `,
      });
    

    return entity;
  },
};
