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
        console.log('test')
        for( let key in filters){
            let entities = await strapi.services[key.slice(0,-1)].find({_limit: -1});
            filters[key] = entities
            console.log(entities)
        }
        return filters
    }
}