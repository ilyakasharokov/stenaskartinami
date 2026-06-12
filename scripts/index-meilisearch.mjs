const STRAPI = process.env.STRAPI_URL || 'http://localhost:1337/api';
const MEILI = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_KEY = process.env.MEILI_KEY || '';
const PAGE_SIZE = 100;

async function fetchAll() {
  let page = 1;
  const all = [];
  while (true) {
    const url = `${STRAPI}/arts?populate[Artist]=true&populate[Pictures]=true&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`;
    const res = await fetch(url);
    const json = await res.json();
    const items = json.data || [];
    all.push(...items);
    process.stdout.write(`\rFetched ${all.length} arts...`);
    if (items.length < PAGE_SIZE) break;
    page++;
  }
  console.log('');
  return all;
}

function transform(e) {
  const pic = e.Pictures?.[0];
  return {
    id: e.id,
    Title: e.Title || '',
    slug: e.slug || '',
    img: pic?.url || null,
    img_thumb: pic?.formats?.thumbnail?.url || pic?.formats?.small?.url || pic?.url || null,
    Artist_full_name: e.Artist?.full_name || '',
  };
}

async function meili(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (MEILI_KEY) headers['Authorization'] = `Bearer ${MEILI_KEY}`;
  const res = await fetch(`${MEILI}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function main() {
  console.log('Fetching arts from Strapi...');
  const arts = await fetchAll();
  console.log(`Total: ${arts.length} arts`);

  await meili('PATCH', '/indexes/art/settings', {
    searchableAttributes: ['Title', 'Artist_full_name'],
    displayedAttributes: ['id', 'Title', 'slug', 'img', 'img_thumb', 'Artist_full_name'],
  });

  const docs = arts.map(transform);
  const task = await meili('POST', '/indexes/art/documents?primaryKey=id', docs);
  console.log(`Indexing task: ${task.taskUid}, status: ${task.status}`);

  let status;
  do {
    await new Promise(r => setTimeout(r, 500));
    const t = await meili('GET', `/tasks/${task.taskUid}`);
    status = t.status;
    process.stdout.write(`\rStatus: ${status}...`);
  } while (status === 'enqueued' || status === 'processing');

  const final = await meili('GET', `/tasks/${task.taskUid}`);
  if (final.status === 'succeeded') {
    console.log(`\nDone! Indexed ${final.details?.indexedDocuments} documents.`);
  } else {
    console.error('\nFailed:', JSON.stringify(final.error));
  }
}

main().catch(console.error);
