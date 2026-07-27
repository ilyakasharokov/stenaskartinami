const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const normalizeEntry = (entry: unknown): unknown => {
  if (!isObject(entry)) return entry
  if (!('id' in entry) || !('attributes' in entry)) return entry

  const normalized: Record<string, unknown> = { id: entry.id }
  for (const [key, value] of Object.entries(entry.attributes as Record<string, unknown>)) {
    if (isObject(value) && 'data' in value) {
      normalized[key] = normalizeData(value.data)
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(normalizeEntry)
    } else {
      normalized[key] = value
    }
  }
  return normalized
}

const normalizeData = (data: unknown): unknown => {
  if (Array.isArray(data)) return data.map(normalizeEntry)
  return normalizeEntry(data)
}

export const normalizeStrapiResponse = (payload: unknown): any => {
  if (payload && isObject(payload) && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return normalizeData((payload as { data: unknown }).data)
  }
  return payload
}

export const fetchStrapi = async (url: string, options?: RequestInit): Promise<any> => {
  const res = await fetch(url, options)
  const json = await res.json()
  return normalizeStrapiResponse(json)
}
