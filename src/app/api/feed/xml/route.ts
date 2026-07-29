import { NextResponse } from 'next/server';

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>LINDA FASHION - Produktový Feed</title>
    <link>https://lindafashion.cz</link>
    <description>Produktový katalog italské dámské módy pro Meta / Google Merchant Center</description>
    <item>
      <g:id>LF-SAT-001</g:id>
      <g:title>Hedvábné šaty Bellissima</g:title>
      <g:description>Luxusní zavinovací šaty z 100% italského hedvábí.</g:description>
      <g:link>https://lindafashion.cz/produkt/hedvabne-saty-bellissima</g:link>
      <g:price>3490 CZK</g:price>
      <g:availability>in stock</g:availability>
      <g:brand>Milano Elegance</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Dresses</g:google_product_category>
    </item>
    <item>
      <g:id>LF-SVE-003</g:id>
      <g:title>Kašmírový svetr Roma</g:title>
      <g:description>Hebký svetr z kašmíru a merina.</g:description>
      <g:link>https://lindafashion.cz/produkt/kasmirovy-svetr-roma</g:link>
      <g:price>2990 CZK</g:price>
      <g:sale_price>2390 CZK</g:sale_price>
      <g:availability>in stock</g:availability>
      <g:brand>Roma Knitwear</g:brand>
      <g:condition>new</g:condition>
    </item>
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
