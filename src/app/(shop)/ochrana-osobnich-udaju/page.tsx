import React from 'react';

export default function GDPRPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-linda-espresso">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Ochrana osobních údajů (GDPR)</h1>
        <p className="text-xs text-linda-espresso/70 mt-1">Informace o zpracování osobních údajů v LINDA FASHION</p>
      </div>

      <div className="prose prose-stone max-w-none text-xs space-y-6 leading-relaxed">
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">1. Správce osobních údajů</h2>
          <p>
            Správcem osobních údajů je LINDA FASHION s.r.o., Pařížská 12, Praha 1, e-mail: info@lindafashion.cz.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">2. Rozsah a účel zpracování</h2>
          <p>
            Zpracováváme vaše jméno, doručovací a fakturační adresu, e-mail a telefon výhradně za účelem vyřízení objednávky, doručení zboží a plnění zákonných daňových povinností. Souhlas s marketingovým e-mailem udělujete zcela samostatně a dobrovolně.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">3. Vaše práva a výmaz údajů</h2>
          <p>
            Máte právo na přístup k údajům, opravu, výmaz či omezení zpracování. Při výmazu účtu anonymizujeme osobní údaje, přičemž účetní doklady uchováváme dle požadavků zákona o účetnictví.
          </p>
        </section>
      </div>
    </div>
  );
}
