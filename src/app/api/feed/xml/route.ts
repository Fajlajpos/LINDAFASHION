import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';

/**
 * Produktový feed pro Meta Commerce Manager a Google Merchant Center
 * (sekce 18 zadání).
 *
 * Dřív vracel dva natvrdo napsané vymyšlené produkty. Teď se generuje
 * z databáze, takže se katalog do Facebooku i Google Nákupů propíše sám.
 *
 * `force-dynamic`, ne `revalidate`: s revalidací by se feed generoval už při
 * buildu, jenže image se v Dockeru staví bez databáze a build by na tom spadl.
 * Meta ani Google si feed nestahují často, takže dotaz na požadavek nevadí –
 * a čerstvost drží hlavička `Cache-Control` níž.
 */
export const dynamic = 'force-dynamic';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const produkty = await db.product.findMany({
    where: {
      aktivni: true,
      // Poukazy do produktového katalogu reklamy nepatří – Meta i Google
      // je řadí mezi dárkové karty s vlastními pravidly.
      jeDarkovyPoukaz: false,
    },
    include: {
      category: { select: { nazev: true } },
      variants: { select: { skladem: true } },
      images: {
        where: { stavZpracovani: 'HOTOVO' },
        orderBy: [{ jeHlavni: 'desc' }, { poradi: 'asc' }],
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const polozky = produkty
    .map((p) => {
      const skladem = p.variants.reduce((s, v) => s + v.skladem, 0);
      const cena = Number(p.cena);
      const akcni = p.cenaPoSleve === null ? null : Number(p.cenaPoSleve);
      const obrazek = p.images[0]?.url;

      return `    <item>
      <g:id>${esc(p.sku || p.id)}</g:id>
      <g:title>${esc(p.nazev)}</g:title>
      <g:description>${esc(p.popis.replace(/\s+/g, ' ').slice(0, 5000))}</g:description>
      <g:link>${ZAKLADNI_URL}/produkt/${esc(p.slug)}</g:link>
      <g:price>${cena.toFixed(2)} CZK</g:price>${
        akcni !== null ? `\n      <g:sale_price>${akcni.toFixed(2)} CZK</g:sale_price>` : ''
      }
      <g:availability>${skladem > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:condition>new</g:condition>${
        p.znacka ? `\n      <g:brand>${esc(p.znacka)}</g:brand>` : ''
      }${obrazek ? `\n      <g:image_link>${ZAKLADNI_URL}${esc(obrazek)}</g:image_link>` : ''}
      <g:product_type>${esc(p.category.nazev)}</g:product_type>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>LINDA FASHION – produktový feed</title>
    <link>${ZAKLADNI_URL}</link>
    <description>Katalog italské dámské módy pro Meta Commerce Manager a Google Merchant Center</description>
${polozky}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
