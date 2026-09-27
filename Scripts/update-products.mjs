// מושך את כל המוצרים העדכניים מהאתר art-karmiel.co.il ושומר ל-products.json
// רץ אוטומטית בכל פריסה ב-Render (Build Command). אם משהו נכשל – נשאר הקטלוג הקודם.
import { writeFileSync, readFileSync } from 'node:fs';

const API = 'https://www.art-karmiel.co.il/wp-json/wc/store/v1/products';
const FIELDS = 'id,name,permalink,prices,images,categories,is_in_stock,on_sale,short_description';

const decode = s => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;| /g, ' ');
const clean = s => decode(String(s || '').replace(/<\/p>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
  .split('\n').map(l => l.trim()).filter(Boolean).join('\n');
const thumb = im => (im.srcset || '').match(/(\S+-300x300\.\w+) 300w/)?.[1] || im.thumbnail || im.src;

async function main() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${API}?per_page=100&page=${page}&_fields=${FIELDS}`, { headers: { 'User-Agent': 'art-karmiel-app-build' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} on page ${page}`);
    const list = await r.json();
    all.push(...list);
    if (list.length < 100) break;
  }
  if (all.length < 20) throw new Error(`only ${all.length} products – suspicious, keeping old file`);
  const products = all.map(p => {
    const pr = p.prices || {}; const mu = pr.currency_minor_unit || 0;
    const f = v => (v ? Math.round(+v) / 10 ** mu : null);
    const imgs = p.images || [];
    return {
      id: p.id, n: decode(p.name).trim(), p: f(pr.price), rp: f(pr.regular_price),
      t: imgs[0] ? thumb(imgs[0]) : '', i: imgs[0]?.src || '', g: imgs.slice(1, 4).map(x => x.src),
      c: (p.categories || []).map(c => c.id), s: p.is_in_stock ? 1 : 0, d: clean(p.short_description), u: p.permalink,
    };
  });
  writeFileSync('products.json', JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: 'https://www.art-karmiel.co.il', products }));
  console.log(`✓ products.json updated: ${products.length} products`);
}

main().catch(e => {
  let n = '?'; try { n = JSON.parse(readFileSync('products.json', 'utf8')).products.length; } catch {}
  console.warn(`⚠ Could not refresh catalog (${e.message}). Keeping existing products.json (${n} products).`);
});
