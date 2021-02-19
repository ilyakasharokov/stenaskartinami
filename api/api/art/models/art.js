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
        data.slug = slugify(data.Title, {lower: true,remove: /[*+~.()'"!:@]/g});
      }
    },
    beforeUpdate: async (params, data) => {
        console.log('before' + data.Title)
      if (data.Title) {
        data.slug = slugify(data.Title, {lower: true,remove: /[*+~.()'"!:@]/g});
      }
    },
  },
};
