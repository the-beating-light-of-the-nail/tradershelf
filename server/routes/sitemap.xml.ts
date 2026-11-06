// sitemap.xml：构建时随快照一起静态化（nitro prerender）
import sectors from '~/data/sectors.config.json'
import dates from '~/data/archive-index.json'
import snap from '~/data/snapshot.json'

export default defineEventHandler((event) => {
  const base = 'https://tradershelf.com'
  const today = (snap as any).meta?.tradeDate || new Date().toISOString().slice(0, 10)
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: '/', lastmod: today },
    { loc: '/us', lastmod: today },
    { loc: '/hk', lastmod: today },
    { loc: '/crypto' },
    { loc: '/xingtu', lastmod: today },
    { loc: '/archive' },
    { loc: '/about' }, { loc: '/privacy' }, { loc: '/disclaimer' }, { loc: '/contact' },
  ]
  for (const s of sectors as any[]) urls.push({ loc: `/sector/${s.slug}`, lastmod: today })
  for (const d of dates as string[]) urls.push({ loc: `/archive/${d}`, lastmod: d })
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>'
  setHeader(event, 'content-type', 'application/xml')
  return xml
})
