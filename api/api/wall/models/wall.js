'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const slugify = require('slugify');

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.Title) {
        data.slug = slugify(data.Title, {lower: true,remove: /[*+~.()'"!:@ь«»\/#,]/g});
      }
    },
    beforeUpdate: async (params, data) => {
      if (data.Title) {
        data.slug = slugify(data.Title, {lower: true,remove: /[*+~.()'"!:@ь«»\/#,]/g});
      }
    },
  },
};
