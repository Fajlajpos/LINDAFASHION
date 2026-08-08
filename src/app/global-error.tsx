'use client';

import React, { useEffect } from 'react';
import '../styles/globals.css';

/**
 * Poslední záchyt: chyba v kořenovém layoutu.
 *
 * `error.tsx` je uvnitř layoutu, takže chybu v něm samotném zachytit nemůže.
 * Tahle komponenta layout nahrazuje celý – proto si musí nést vlastní `html`
 * a `body`, jak vyžaduje Next.
 *
 * Nemá k dispozici fonty z `next/font` (ty se registrují právě v layoutu),
 * takže se schválně drží systémového písma a jen pár barev napsaných napřímo:
 * v okamžiku, kdy hoří kořen aplikace, je čitelná hláška víc než značka.
 * Je to jediné místo v projektu, kde jsou barvy mimo tokeny – jinde platí zákaz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[kořen] Neošetřená chyba:', error);
  }, [error]);

  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F6F3EC',
          color: '#2B2019',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          padding: '1rem',
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            Web je dočasně nedostupný
          </h1>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem', opacity: 0.8 }}>
            Omlouváme se, něco se pokazilo na naší straně. Zkuste to prosím za chvíli znovu.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '44px',
              padding: '0 1.5rem',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#7A4B32',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            Zkusit znovu
          </button>

          {error.digest && (
            <p style={{ fontSize: '0.6875rem', marginTop: '1.5rem', opacity: 0.7 }}>
              Kód chyby: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
