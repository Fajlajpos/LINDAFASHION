import React from 'react';
import Link from 'next/link';

export default function ObchodniPodminkyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-linda-espresso">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Všeobecné obchodní podmínky</h1>
        <p className="text-xs text-linda-espresso/70 mt-1">Platné od 1. 1. 2026 pro e-shop LINDA FASHION</p>
      </div>

      <div className="prose prose-stone max-w-none text-xs space-y-6 leading-relaxed">
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">1. Základní ustanovení</h2>
          <p>
            Tyto všeobecné obchodní podmínky (dále jen &bdquo;VOP&ldquo;) upravují práva a povinnosti mezi prodávajícím LINDA FASHION s.r.o., IČO: 12345678, se sídlem Pařížská 12, Praha 1, zapísaným v obchodním rejstříku (dále jen &bdquo;prodávající&ldquo;) a kupujícím (dále jen &bdquo;zákazník&ldquo;).
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">2. Objednávka a uzavření kupní smlouvy</h2>
          <p>
            Veškerá prezentace zboží umístěná na e-shopu je informativního charakteru. Odesláním objednávky zákazník stvrzuje, že se seznámil s těmito VOP. Kupní smlouva vzniká doručením potvrzení objednávky na e-mail zákazníka.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">3. Ceny a platební podmínky</h2>
          <p>
            Ceny zboží jsou uváděny v českých korunách (CZK). Úhrada je možná online platbou kartou (GoPay) nebo bezhotovostním bankovním převodem na účet prodávajícího s QR platbou. Dobírka není podporována.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">4. Odstoupení od smlouvy do 14 dnů</h2>
          <p>
            Kupující spotřebitel má právo odstoupit od smlouvy bez udání důvodu ve lhůtě 14 dnů ode dne převzetí zboží. Zboží musí být vráceno nepoškozené, nenosené a s původními visačkami.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">5. Mimosoudní řešení sporů (ČOI)</h2>
          <p>
            K mimosoudnímu řešení spotřebitelských sporů z kupní smlouvy je příslušná Česká obchodní inspekce, se sídlem Štěpánská 567/15, 120 00 Praha 2, internetová adresa: www.coi.cz.
          </p>
        </section>
      </div>
    </div>
  );
}
