'use strict';
const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async filter(ctx) {
        let arts = [];
        let entities;
        if(ctx.query.styles){
            //ctx.send(ctx.query.styles)
            entities = await strapi.services.style.find({slug: ctx.query.styles});
        }
        for( let style of entities){
            if(style.arts){
                arts = arts.concat(style.arts)
            }
        }
        return arts.map(entity => sanitizeEntity(entity, { model: strapi.models.art }));
        /*
        if (ctx.query._q) {
          entities = await strapi.services.art.search(ctx.query);
        } else {
          entities = await strapi.services.art.find(ctx.query);
        }
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.art })); */
      },

      async allArts(ctx) {
        let entities = await  strapi.query('art').find({_limit: -1});
	// console.log(entities)
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.art })); 
      },

      async findOneAll(ctx) {
        // some logic here
        console.log(ctx.params)
        const response = await strapi.query('art').findOne({id:ctx.params.id});
        // some more logic
      
        return response;
      },

	async createD(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.art.create(data, { files });
    } else {
      entity = await strapi.services.art.create({...ctx.request.body, published_at: null});
    }
	  entity.published_at = null;
    entity = sanitizeEntity(entity, { model: strapi.models.art });

    // send an email by using the email plugin
    try{
      await strapi.plugins['email'].services.email.send({
        to: 'ilyakasharokov@mail.ru, dudkinet@gmail.com',
        from: 'no-reply@stenaskartinami.com',
        subject: 'Стена с картинами, новая картина на модерации',
        text: `
          Форма: "Новая картина",
          Имя: ${entity.Title}
          Художник: ${entity.Artist.full_name}
        `,
      });
    }catch(e){
      console.log(e);
    }

    return entity;
  },
};
