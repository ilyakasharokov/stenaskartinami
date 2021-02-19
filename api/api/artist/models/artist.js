'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const slugify = require('slugify');

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.full_name) {
        data.slug = slugify(data.full_name, {lower: true,remove: /[*+~.()'"!:@]/g});
      }
    },
    beforeUpdate: async (params, data) => {
      if (data.full_name) {
        data.slug = slugify(data.full_name, {lower: true, remove: /[*+~.()'"!:@]/g});
      }
    },
  },
};
