import React from 'react';

/**
 * Vykreslí strukturovaná data jako `<script type="application/ld+json">`.
 *
 * `JSON.stringify` tu nestačí sám o sobě: kdyby se do dat dostal text
 * obsahující `</script>`, prohlížeč by blok ukončil dřív a zbytek by zpracoval
 * jako HTML. Escapujeme proto lomítko.
 */
export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;

  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    // eslint-disable-next-line react/no-danger
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
