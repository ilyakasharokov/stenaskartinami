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
        data.slug = slugify(data.Title, {lower: true,remove: /[*+~.()'"!:@ь«»]/g});
      }
      if(data.width && data.height){
        data.square = data.width * data.height;
      }
      if(data.width === data.height){
        data.isSquare = true;
      }
    },
    beforeUpdate: async (params, data) => {
        console.log('before' + data.Title)
      if (data.Title) {
        data.slug = slugify(data.Title, {lower: true,remove: /[*+~.()'"!:@ь«»]/g});
      }
      if(data.Size){
        if(data.Size.Height){
          data.height = data.Size.Height
        }
        if(data.Size.Width){
          data.width = data.Size.Width
        }
        if(data.width && data.height){
          data.square = data.width * data.height;
        }
        if(data.width === data.height){
          data.isSquare = true;
        }
      }
    },
  },
};

