import React from 'react';

export default function CookiesInfoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-linda-espresso">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Zásady používání souborů Cookies</h1>
        <p className="text-xs text-linda-espresso/70 mt-1">Podrobné vysvětlení souborů cookies na LINDA FASHION</p>
      </div>

      <div className="prose prose-stone max-w-none text-xs space-y-6 leading-relaxed">
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">Co jsou soubory cookies?</h2>
          <p>
            Cookies jsou malé textové soubory ukládané ve vašem prohlížeči. Slouží k uchování stavu košíku, zapamatování přihlášení a poskytování bezpečné služby. Nastavení cookies můžete kdykoliv upravit tlačítkem v patičce nášho webu.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">Kategorie používáných cookies</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Nezbytné (Technické):</strong> Nutné pro nákupní košík, autentizaci a bezpečnost. Nejde je vypnout.</li>
            <li><strong>Analytické:</strong> Pomáhají nám anonymně měřit návštěvnost a zlepšovat web.</li>
            <li><strong>Marketingové:</strong> Používají se pro cílění relevantních reklam z italské módy (Meta Pixel). Načtou se jen s vaším souhlasem.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
