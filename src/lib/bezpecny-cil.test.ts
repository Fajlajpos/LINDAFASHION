import { describe, expect, it } from 'vitest';
import { bezpecnyCil } from './bezpecny-cil';

describe('bezpecnyCil', () => {
  const ZALOHA = '/muj-ucet';

  it('pustí cestu v rámci webu i s dotazem a kotvou', () => {
    expect(bezpecnyCil('/muj-ucet', ZALOHA)).toBe('/muj-ucet');
    expect(bezpecnyCil('/pokladna?x=1', ZALOHA)).toBe('/pokladna?x=1');
    expect(bezpecnyCil('/admin/objednavky#nove', ZALOHA)).toBe('/admin/objednavky#nove');
  });

  it('odmítne zpětné lomítko, které prohlížeč čte jako druhé lomítko', () => {
    expect(bezpecnyCil('/\\evil.com', ZALOHA)).toBe(ZALOHA);
    expect(bezpecnyCil('/\\/evil.com', ZALOHA)).toBe(ZALOHA);
  });

  it('odmítne absolutní a protokolově relativní adresy', () => {
    expect(bezpecnyCil('//evil.com', ZALOHA)).toBe(ZALOHA);
    expect(bezpecnyCil('https://evil.com', ZALOHA)).toBe(ZALOHA);
    expect(bezpecnyCil('javascript:alert(1)', ZALOHA)).toBe(ZALOHA);
  });

  it('odmítne řídicí znaky, které prohlížeč z URL tiše vypouští', () => {
    expect(bezpecnyCil('/\t/evil.com', ZALOHA)).toBe(ZALOHA);
    expect(bezpecnyCil('/\n/evil.com', ZALOHA)).toBe(ZALOHA);
  });

  it('bez cíle vrátí zálohu', () => {
    expect(bezpecnyCil(null, ZALOHA)).toBe(ZALOHA);
    expect(bezpecnyCil('', ZALOHA)).toBe(ZALOHA);
  });
});
