const STRAPI = process.env.STRAPI_URL || 'http://localhost:1337/api';
const MEILI = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_KEY = process.env.MEILI_KEY || '';
const PAGE_SIZE = 100;

async function fetchAll(path) {
  let page = 1;
  const all = [];
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${STRAPI}/${path}${sep}pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`;
    const res = await fetch(url);
    const json = await res.json();
    const items = json.data || [];
    all.push(...items);
    process.stdout.write(`\r  ${all.length} items...`);
    if (items.length < PAGE_SIZE) break;
    page++;
  }
  console.log('');
  return all;
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

async function waitTask(taskUid) {
  let t;
  do {
    await new Promise(r => setTimeout(r, 500));
    t = await meili('GET', `/tasks/${taskUid}`);
    process.stdout.write(`\r  status: ${t.status}...`);
  } while (t.status === 'enqueued' || t.status === 'processing');
  console.log('');
  return t;
}

async function indexArts() {
  console.log('Indexing arts...');
  const arts = await fetchAll('arts?populate[Artist]=true&populate[Pictures]=true');
  console.log(`  Total: ${arts.length}`);

  await meili('PATCH', '/indexes/art/settings', {
    searchableAttributes: ['Title', 'Artist_full_name'],
    displayedAttributes: ['id', 'Title', 'slug', 'img', 'img_thumb', 'Artist_full_name'],
  });

  const docs = arts.map(e => {
    const pic = e.Pictures?.[0];
    return {
      id: e.id,
      Title: e.Title || '',
      slug: e.slug || '',
      img: pic?.url || null,
      img_thumb: pic?.formats?.thumbnail?.url || pic?.formats?.small?.url || pic?.url || null,
      Artist_full_name: e.Artist?.full_name || '',
    };
  });

  const task = await meili('POST', '/indexes/art/documents?primaryKey=id', docs);
  const final = await waitTask(task.taskUid);
  if (final.status === 'succeeded') console.log(`  Done: ${final.details?.indexedDocuments} docs`);
  else console.error('  Failed:', JSON.stringify(final.error));
}

async function indexArtists() {
  console.log('Indexing artists...');
  const artists = await fetchAll('artists?populate=photos');
  console.log(`  Total: ${artists.length}`);

  await meili('PATCH', '/indexes/artist/settings', {
    searchableAttributes: ['full_name'],
    displayedAttributes: ['id', 'full_name', 'slug', 'avatar'],
  });

  const docs = artists.map(e => {
    const photo = (e.photos || [])[0];
    return {
      id: e.id,
      full_name: e.full_name || '',
      slug: e.slug || '',
      avatar: photo?.formats?.thumbnail?.url || photo?.formats?.small?.url || photo?.url || null,
    };
  });

  const task = await meili('POST', '/indexes/artist/documents?primaryKey=id', docs);
  const final = await waitTask(task.taskUid);
  if (final.status === 'succeeded') console.log(`  Done: ${final.details?.indexedDocuments} docs`);
  else console.error('  Failed:', JSON.stringify(final.error));
}

async function indexWalls() {
  console.log('Indexing walls...');
  const walls = await fetchAll('walls');
  console.log(`  Total: ${walls.length}`);

  await meili('PATCH', '/indexes/wall/settings', {
    searchableAttributes: ['Title', 'Address'],
    displayedAttributes: ['id', 'Title', 'slug', 'Address'],
  });

  const docs = walls.map(e => ({
    id: e.id,
    Title: e.Title || '',
    slug: e.slug || '',
    Address: e.Address || '',
  }));

  const task = await meili('POST', '/indexes/wall/documents?primaryKey=id', docs);
  const final = await waitTask(task.taskUid);
  if (final.status === 'succeeded') console.log(`  Done: ${final.details?.indexedDocuments} docs`);
  else console.error('  Failed:', JSON.stringify(final.error));
}

async function main() {
  await indexArts();
  await indexArtists();
  await indexWalls();
  console.log('All done!');
}

main().catch(console.error);
