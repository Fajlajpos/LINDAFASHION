import React from 'react';

export default function ReklamacniRadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-linda-espresso">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Reklamační řád &amp; Vrácení zboží</h1>
        <p className="text-xs text-linda-espresso/70 mt-1">Postup pro bezstarostné vrácení nebo reklamaci v LINDA FASHION</p>
      </div>

      <div className="prose prose-stone max-w-none text-xs space-y-6 leading-relaxed">
        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">1. Lhůta pro vrácení zboží</h2>
          <p>
            Všechny kousky můžete do 14 dnů od doručení zdarma vyzkoušet a vrátit bez udání důvodu. Zboží musí být nenosené, v původním stavu a s neodstřiženou visačkou.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="font-serif text-lg text-linda-cognac">2. Postup při reklamaci vad</h2>
          <p>
            Záruční doba na veškeré oblečení činí 24 měsíců. V případě vady zašlete zboží s popisem vady na naši adresu Butiku: Pařížská 12, 110 00 Praha 1. Reklamaci vyřídíme nejpozději do 30 dnů.
          </p>
        </section>
      </div>
    </div>
  );
}
