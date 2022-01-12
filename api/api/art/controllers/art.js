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

	async createD(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.art.create(data, { files });
    } else {
      entity = await strapi.services.art.create({...ctx.request.body, published_at: null});
    }
	entity.published_at = null;
    return sanitizeEntity(entity, { model: strapi.models.art });
  },
};
