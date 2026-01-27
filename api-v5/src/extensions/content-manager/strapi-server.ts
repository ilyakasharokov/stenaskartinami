export default (plugin: any) => {
  const setDefaultStatus = (ctx: any) => {
    const query = ctx?.request?.query || ctx?.query;
    if (query && typeof query.status === 'undefined') {
      query.status = 'published';
      ctx.query = query;
      if (ctx.request) {
        ctx.request.query = query;
      }
    }
  };

  const originalFind = plugin.controllers['collection-types'].find;
  plugin.controllers['collection-types'].find = async (ctx: any) => {
    setDefaultStatus(ctx);
    return originalFind(ctx);
  };

  const originalFindOne = plugin.controllers['collection-types'].findOne;
  plugin.controllers['collection-types'].findOne = async (ctx: any) => {
    setDefaultStatus(ctx);
    return originalFindOne(ctx);
  };

  return plugin;
};
