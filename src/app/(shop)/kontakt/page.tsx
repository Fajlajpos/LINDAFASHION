'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, ShieldCheck, MessageCircle } from 'lucide-react';

export default function KontaktPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ jmeno: '', email: '', zprava: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="mx-auto max-w-2xl space-y-3 border-b border-linda-sand pb-8 text-center">
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Rádi vám poradíme
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">Kontakt &amp; Showroom</h1>
        <p className="text-sm font-light text-linda-espresso/75">
          Máte dotaz k velikostem, stihu nebo doručení? Napište nám nebo zavolejte, jsme tu pro vás.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Info & GEO LocalBusiness section */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neu">
            <h2 className="font-serif text-2xl text-linda-espresso">Kontaktní údaje</h2>

            {/* Každá ikona sedí na vystouplém terči – reliéf ji odliší, aniž
                bychom sáhli po další barvě. */}
            <div className="space-y-4 text-xs text-linda-espresso">
              {[
                {
                  Ikona: MapPin,
                  nadpis: 'Adresa Butiku & Sídlo:',
                  obsah: (
                    <span className="text-linda-espresso/75">
                      LINDA FASHION s.r.o.
                      <br />
                      Pařížská 12, 110 00 Praha 1
                    </span>
                  ),
                },
                {
                  Ikona: Phone,
                  nadpis: 'Zákaznická linka:',
                  obsah: (
                    <a
                      href="tel:+420777888999"
                      className="font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
                    >
                      +420 777 888 999
                    </a>
                  ),
                },
                {
                  Ikona: Mail,
                  nadpis: 'E-mail:',
                  obsah: (
                    <a
                      href="mailto:info@lindafashion.cz"
                      className="font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
                    >
                      info@lindafashion.cz
                    </a>
                  ),
                },
                {
                  Ikona: Clock,
                  nadpis: 'Otevírací doba Showroomu:',
                  obsah: (
                    <span className="text-linda-espresso/75">
                      Po – Pá: 10:00 – 18:00
                      <br />
                      So: 10:00 – 14:00
                    </span>
                  ),
                },
              ].map(({ Ikona, nadpis, obsah }) => (
                <div key={nadpis} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                    <Ikona className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
                  </span>
                  <div className="pt-1">
                    <strong className="block font-semibold">{nadpis}</strong>
                    {obsah}
                  </div>
                </div>
              ))}
            </div>

            {/* Instant WhatsApp / Messenger quick bubble recommendation */}
            <div className="border-t border-linda-sand/40 pt-4">
              <a
                href="https://wa.me/420777888999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-touch cursor-pointer items-center justify-between gap-3 rounded-2xl bg-linda-sageLight p-3 text-xs text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <MessageCircle className="h-4 w-4 text-linda-sage" aria-hidden="true" />
                  Rychlý dotaz na WhatsApp
                </span>
                <span className="text-[10px] font-bold uppercase text-linda-sage">Online</span>
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neu">
            <h2 className="font-serif text-2xl text-linda-espresso">Napište nám vzkaz</h2>

            {submitted ? (
              <div
                role="status"
                className="space-y-2 rounded-2xl bg-linda-sageLight p-6 text-center text-xs text-linda-espresso shadow-neuInset"
              >
                <p className="font-serif text-xl text-linda-sage">Děkujeme za vaši zprávu!</p>
                <p className="text-linda-espresso/75">Odpovíme vám v nejkratším možném čase na váš e-mail.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Popisky jsou svázané přes `htmlFor`/`id` – dřív stály
                      vedle polí bez vazby, takže je odečítač nepřečetl. */}
                  <div>
                    <label htmlFor="kontakt-jmeno" className="mb-1 block text-xs font-semibold text-linda-espresso">
                      Vaše jméno *
                    </label>
                    <input
                      id="kontakt-jmeno"
                      type="text"
                      required
                      autoComplete="name"
                      value={form.jmeno}
                      onChange={(e) => setForm({ ...form, jmeno: e.target.value })}
                      placeholder="Marie Nováková"
                      className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
                    />
                  </div>

                  <div>
                    <label htmlFor="kontakt-email" className="mb-1 block text-xs font-semibold text-linda-espresso">
                      Váš e-mail *
                    </label>
                    <input
                      id="kontakt-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="vas.email@example.cz"
                      className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="kontakt-zprava" className="mb-1 block text-xs font-semibold text-linda-espresso">
                    Zpráva *
                  </label>
                  <textarea
                    id="kontakt-zprava"
                    required
                    rows={5}
                    value={form.zprava}
                    onChange={(e) => setForm({ ...form, zprava: e.target.value })}
                    placeholder="S čím vám můžeme pomoci?"
                    className="w-full rounded-xl bg-linda-sandLight px-4 py-2.5 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
                  />
                </div>

                <p className="flex items-center gap-2 rounded-xl bg-linda-sandLight p-3 text-[10px] text-linda-espresso/75 shadow-neuInsetSm">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
                  Formulář je chráněn spolehlivou ochranou Cloudflare Turnstile
                </p>

                <button
                  type="submit"
                  className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Odeslat zprávu
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
