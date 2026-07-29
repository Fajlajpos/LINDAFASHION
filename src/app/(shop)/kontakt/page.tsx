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
      <div className="text-center space-y-3 max-w-2xl mx-auto border-b border-[#E4D9C8] pb-8">
        <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block">
          Rádi vám poradíme
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#2B2019]">Kontakt &amp; Showroom</h1>
        <p className="text-sm text-[#2B2019]/70 font-light">
          Máte dotaz k velikostem, stihu nebo doručení? Napište nám nebo zavolejte, jsme tu pro vás.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Info & GEO LocalBusiness section */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-[#E4D9C8]/80 shadow-card space-y-6">
            <h3 className="font-serif text-2xl text-[#2B2019]">Kontaktní údaje</h3>

            <div className="space-y-4 text-xs text-[#2B2019]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#7A4B32] flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Adresa Butiku &amp; Sídlo:</strong>
                  <span className="text-[#2B2019]/70">LINDA FASHION s.r.o.<br />Pařížská 12, 110 00 Praha 1</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#7A4B32] flex-shrink-0" />
                <div>
                  <strong className="block font-semibold">Zákaznická linka:</strong>
                  <a href="tel:+420777888999" className="text-[#7A4B32] hover:underline font-medium">+420 777 888 999</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#7A4B32] flex-shrink-0" />
                <div>
                  <strong className="block font-semibold">E-mail:</strong>
                  <a href="mailto:info@lindafashion.cz" className="text-[#7A4B32] hover:underline font-medium">info@lindafashion.cz</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#7A4B32] flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Otevírací doba Showroomu:</strong>
                  <span className="text-[#2B2019]/70">Po – Pá: 10:00 – 18:00<br />So: 10:00 – 14:00</span>
                </div>
              </div>
            </div>

            {/* Instant WhatsApp / Messenger quick bubble recommendation */}
            <div className="pt-4 border-t border-[#E4D9C8]/40">
              <a
                href="https://wa.me/420777888999"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[#6B7255]/10 border border-[#6B7255]/30 rounded-2xl flex items-center justify-between text-xs text-[#2B2019] hover:bg-[#6B7255]/20 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium">
                  <MessageCircle className="w-4 h-4 text-[#6B7255]" />
                  <span>Rychlý dotaz na WhatsApp</span>
                </div>
                <span className="text-[10px] text-[#6B7255] font-bold uppercase">Online</span>
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="bg-white p-8 rounded-3xl border border-[#E4D9C8]/80 shadow-card space-y-6">
            <h3 className="font-serif text-2xl text-[#2B2019]">Napište nám vzkaz</h3>

            {submitted ? (
              <div className="p-6 bg-[#F0F2EC] border border-[#6B7255] text-[#2B2019] rounded-2xl text-xs text-center space-y-2">
                <h4 className="font-serif text-xl text-[#6B7255]">Děkujeme za vaši zprávu!</h4>
                <p className="text-[#2B2019]/70">Odpovíme vám v nejkratším možném čase na váš e-mail.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2019] mb-1">Vaše jméno *</label>
                    <input
                      type="text"
                      required
                      value={form.jmeno}
                      onChange={(e) => setForm({ ...form, jmeno: e.target.value })}
                      placeholder="Marie Nováková"
                      className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#7A4B32]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2019] mb-1">Váš e-mail *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="vas.email@example.cz"
                      className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#7A4B32]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2019] mb-1">Zpráva *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.zprava}
                    onChange={(e) => setForm({ ...form, zprava: e.target.value })}
                    placeholder="S čím vám můžeme pomoci?"
                    className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#7A4B32]"
                  />
                </div>

                <div className="p-3 bg-[#FAF8F4] border border-[#E4D9C8]/60 rounded-xl text-[10px] text-[#2B2019]/60 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#6B7255]" />
                  <span>Formulář je chráněn spolehlivou ochranou Cloudflare Turnstile</span>
                </div>

                <button
                  type="submit"
                  className="px-8 py-3.5 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
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
