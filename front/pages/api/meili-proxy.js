const MEILI_HOST = process.env.MEILISEARCH_INTERNAL_HOST || 'http://localhost:7700';
const MEILI_KEY = process.env.MEILISEARCH_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { index, params } = req.body;
    if (!index) return res.status(400).json({ error: 'Missing index' });

    const headers = { 'Content-Type': 'application/json' };
    if (MEILI_KEY) headers['Authorization'] = `Bearer ${MEILI_KEY}`;

    const p = params || {};
    const body = {};
    if (p.query !== undefined) body.q = p.query;
    else if (p.q !== undefined) body.q = p.q;
    const ALLOWED = ['offset', 'limit', 'page', 'hitsPerPage', 'attributesToRetrieve',
      'attributesToCrop', 'cropLength', 'attributesToHighlight', 'showMatchesPosition',
      'filter', 'sort', 'facets', 'matchingStrategy', 'attributesToSearchOn'];
    for (const k of ALLOWED) {
      if (p[k] !== undefined) body[k] = p[k];
    }

    const meiliRes = await fetch(
      `${MEILI_HOST}/indexes/${encodeURIComponent(index)}/search`,
      { method: 'POST', headers, body: JSON.stringify(body) }
    );

    const data = await meiliRes.json();
    res.status(meiliRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
