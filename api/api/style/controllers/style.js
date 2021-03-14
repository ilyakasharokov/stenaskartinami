'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async filters() {
        let filters = {
            styles: [],
            subjects: [],
            mediums: []
        };
        for( let key of filters){
            let entities = await strapi.services[key.slice(0,-1)].find();
            filters[key] = entities
        }
        return filters
    }
}