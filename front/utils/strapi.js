const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const normalizeEntry = (entry) => {
  if (!isObject(entry)) return entry;
  if (!('id' in entry) || !('attributes' in entry)) return entry;

  const normalized = { id: entry.id };
  for (const [key, value] of Object.entries(entry.attributes)) {
    if (isObject(value) && 'data' in value) {
      normalized[key] = normalizeData(value.data);
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(normalizeEntry);
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
};

const normalizeData = (data) => {
  if (Array.isArray(data)) {
    return data.map(normalizeEntry);
  }
  return normalizeEntry(data);
};

export const normalizeStrapiResponse = (payload) => {
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return normalizeData(payload.data);
  }
  return payload;
};

export const fetchStrapi = async (url, options) => {
  const res = await fetch(url, options);
  const json = await res.json();
  return normalizeStrapiResponse(json);
};
