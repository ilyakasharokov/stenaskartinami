const size = {
  small: [0, 20],
  medium: [20, 40],
  large: [40, 60],
  huge: [60, 1000],
};

const appendPopulate = (params, populate, defaults = []) => {
  const normalizedDefaults = Array.isArray(defaults) ? defaults : [defaults];
  if (!populate) {
    if (normalizedDefaults.length) {
      normalizedDefaults.forEach((value, index) => {
        params.push(`populate[${index}]=${encodeURIComponent(value)}`);
      });
    }
    return;
  }
  if (typeof populate === 'string') {
    params.push(`populate=${encodeURIComponent(populate)}`);
    normalizedDefaults.forEach((value) => {
      params.push(`populate[${encodeURIComponent(value)}]=*`);
    });
    return;
  }
  if (Array.isArray(populate)) {
    const merged = Array.from(new Set([...populate, ...normalizedDefaults]));
    merged.forEach((value, index) => {
      params.push(`populate[${index}]=${encodeURIComponent(value)}`);
    });
    return;
  }
  if (typeof populate === 'object') {
    const merged = { ...populate };
    normalizedDefaults.forEach((value) => {
      if (!(value in merged)) merged[value] = true;
    });
    Object.entries(merged).forEach(([key, value]) => {
      if (value === true) {
        params.push(`populate[${key}]=true`);
        return;
      }
      if (value === '*') {
        params.push(`populate[${key}]=*`);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((nestedValue, index) => {
          params.push(`populate[${key}][${index}]=${encodeURIComponent(nestedValue)}`);
        });
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (Array.isArray(nestedValue)) {
            nestedValue.forEach((entry, index) => {
              params.push(
                `populate[${key}][${nestedKey}][${index}]=${encodeURIComponent(entry)}`
              );
            });
            return;
          }
          params.push(
            `populate[${key}][${nestedKey}]=${encodeURIComponent(nestedValue)}`
          );
        });
        return;
      }
      params.push(`populate[${key}]=${encodeURIComponent(value)}`);
    });
  }
};

function serialize(obj = {}) {
  const params = [];
  const sort = obj._sort || obj.sort || 'publishedAt:desc';

  if (sort) {
    params.push(`sort=${encodeURIComponent(sort)}`);
  }

  const hasLimit = typeof obj._limit !== 'undefined';
  const hasStart = typeof obj._start !== 'undefined';
  const hasPage = typeof obj.page !== 'undefined';
  const hasPageSize = typeof obj.pageSize !== 'undefined';

  if (hasPage && !hasStart) {
    params.push(`pagination[page]=${obj.page}`);
  }

  if (hasPageSize && !hasLimit) {
    params.push(`pagination[pageSize]=${obj.pageSize}`);
  }

  if (hasLimit) {
    params.push(`pagination[pageSize]=${obj._limit}`);
  }

  if (hasStart) {
    if (hasLimit && Number(obj._limit) > 0) {
      const page = Math.floor(Number(obj._start) / Number(obj._limit)) + 1;
      params.push(`pagination[page]=${page}`);
    } else if (!hasPage) {
      params.push(`pagination[start]=${obj._start}`);
    }
  }

  if (typeof obj.main !== 'undefined') {
    params.push(`filters[main][$eq]=${obj.main}`);
  }

  const sizeValues = Array.isArray(obj.size) ? obj.size : obj.size ? [obj.size] : [];
  if (sizeValues.length) {
    sizeValues.forEach((value, index) => {
      params.push(
        `filters[$and][0][$or][${index}][$and][0][square][$gte]=${
          size[value][0] ** 2
        }`
      );
      params.push(
        `filters[$and][0][$or][${index}][$and][1][square][$lte]=${
          size[value][1] ** 2
        }`
      );
    });
  }

  const specialKeys = new Set([
    '_sort',
    'sort',
    '_start',
    '_limit',
    'page',
    'pageSize',
    'populateDefaults',
    'main',
    'size',
    'populate',
  ]);
  let andIndex = sizeValues.length ? 1 : 0;

  Object.entries(obj).forEach(([key, value]) => {
    if (specialKeys.has(key)) return;
    const values = Array.isArray(value) ? value : [value];

    values.forEach((val, index) => {
      params.push(
        `filters[$and][${andIndex}][$or][${index}][${key}][slug][$eq]=${encodeURIComponent(
          val
        )}`
      );
    });

    andIndex += 1;
  });

  const defaults =
    Object.prototype.hasOwnProperty.call(obj, 'populateDefaults') ? obj.populateDefaults : ['Pictures'];
  appendPopulate(params, obj.populate, defaults);

  return params.length ? `?${params.join('&')}` : '';
}

export default serialize