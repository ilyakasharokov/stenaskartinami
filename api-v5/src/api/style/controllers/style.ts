import { sanitize } from '@strapi/utils';
import { factories } from '@strapi/strapi';

const uid = 'api::style.style';

const sanitizeOutput = (data: any, ctx: any) => {
  const sanitizer = (sanitize as any).contentAPI?.output;
  return sanitizer ? sanitizer(data, strapi.getModel(uid), { auth: ctx.state.auth }) : data;
};

export default factories.createCoreController(uid, () => ({
  async filters(ctx) {
    const filters = {
      styles: [],
      subjects: [],
      mediums: [],
    };

    const sources: Array<{ key: string; uid: string }> = [
      { key: 'styles', uid: 'api::style.style' },
      { key: 'subjects', uid: 'api::subject.subject' },
      { key: 'mediums', uid: 'api::medium.medium' },
    ];

    for (const source of sources) {
      filters[source.key] = await strapi.entityService.findMany(source.uid as any, {
        pagination: { pageSize: 10000 },
      } as any);
    }

    return filters;
  },

  async count(ctx) {
    const filters = ctx.query?.filters || {};
    const total = await strapi.entityService.count(uid, { filters });
    return { count: total };
  },
}));
