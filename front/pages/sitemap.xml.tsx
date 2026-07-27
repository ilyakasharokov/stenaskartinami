const SITE = 'https://stenaskartinami.com'
const API  = process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.stenaskartinami.com/api'

function url(loc, priority, changefreq, lastmod) {
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`
}

async function fetchAll(path) {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : [])
  } catch { return [] }
}

export async function getServerSideProps({ res }) {
  const [arts, artists] = await Promise.all([
    fetchAll('/arts?filters[wall][$notNull]=true&fields[0]=slug&fields[1]=id&fields[2]=updatedAt&pagination[pageSize]=1000'),
    fetchAll('/artists?filters[works_count][$gt]=0&filters[publishedAt][$notNull]=true&fields[0]=slug&fields[1]=id&fields[2]=updatedAt&pagination[pageSize]=500'),
  ])

  const today = new Date().toISOString().split('T')[0]

  const staticPages = [
    url(`${SITE}/`,        '1.0', 'daily',   today),
    url(`${SITE}/catalog`, '0.9', 'daily',   today),
    url(`${SITE}/artists`, '0.8', 'weekly',  today),
  ]

  const artPages = arts.map(a => {
    const slug = (a.slug || a.documentId || '') + '--' + a.id
    const lastmod = a.updatedAt ? a.updatedAt.split('T')[0] : today
    return url(`${SITE}/art/${slug}`, '0.8', 'monthly', lastmod)
  })

  const artistPages = artists.map(a => {
    const slug = (a.slug || a.documentId || '') + '--' + a.id
    const lastmod = a.updatedAt ? a.updatedAt.split('T')[0] : today
    return url(`${SITE}/artists/${slug}`, '0.7', 'monthly', lastmod)
  })

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...artPages, ...artistPages].join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(sitemap)
  res.end()

  return { props: {} }
}

export default function Sitemap() { return null }
