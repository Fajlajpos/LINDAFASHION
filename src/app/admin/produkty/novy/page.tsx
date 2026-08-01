'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Plus, Trash2, ArrowLeft, Check, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function NovyProduktPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nazev: '',
    popis: '',
    kategorieId: 'cat1',
    cena: '',
    cenaPoSleve: '',
    znacka: 'Milano Elegance',
    material: '',
    udrzba: '',
    sku: '',
    jeDarkovyPoukaz: false, // Prepínač pre dárkové poukazy (sekce 6.2 & 6.11)
  });

  const [variants, setVariants] = useState([
    { id: '1', velikost: 'S (36)', skladem: 5, obvodHrudniku: '88–92 cm', obvodPasu: '68–72 cm', obvodBoku: '94–98 cm', delka: '115 cm' },
  ]);

  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; name: string; status: 'CEKA' | 'ZPRACOVAVA_SE' | 'HOTOVO' }>>([]);

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newItems = files.map((f, i) => ({
        id: `img_${Date.now()}_${i}`,
        name: f.name,
        status: 'CEKA' as const,
      }));
      setUploadedPhotos([...uploadedPhotos, ...newItems]);

      // Simulace Sharp zpracování ve worker kontejneru
      setTimeout(() => {
        setUploadedPhotos((prev) =>
          prev.map((item) => (newItems.some((n) => n.id === item.id) ? { ...item, status: 'ZPRACOVAVA_SE' } : item))
        );
      }, 1000);

      setTimeout(() => {
        setUploadedPhotos((prev) =>
          prev.map((item) => (newItems.some((n) => n.id === item.id) ? { ...item, status: 'HOTOVO' } : item))
        );
      }, 2500);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Produkt byl úspěšně uložen!');
    router.push('/admin/produkty');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top nav */}
      <div className="flex items-center justify-between border-b border-linda-sand pb-6">
        <div>
          <Link href="/admin/produkty" className="text-xs text-linda-cognac font-semibold hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Zpět na seznam produktů
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl text-linda-espresso">
            {form.jeDarkovyPoukaz ? 'Přidat dárkový poukaz' : 'Přidat nový produkt'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSaveProduct} className="space-y-8">
        {/* Toggle Gift card type */}
        <div className="p-4 bg-linda-cream rounded-2xl shadow-neu flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-xs text-linda-espresso">Jedná se o dárkový poukaz?</h4>
            <p className="text-[11px] text-linda-espresso/60">
              Pokud aktivujete, skryjí se pole pro míry, materiál a péči. Varianty se použijí jako částky.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.jeDarkovyPoukaz}
            onChange={(e) => setForm({ ...form, jeDarkovyPoukaz: e.target.checked })}
            className="w-5 h-5 accent-linda-cognac cursor-pointer"
          />
        </div>

        {/* Basic Information */}
        <div className="bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
          <h3 className="font-serif text-xl text-linda-espresso">Základní údaje</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-linda-espresso mb-1">Název produktu *</label>
              <input
                type="text"
                required
                value={form.nazev}
                onChange={(e) => setForm({ ...form, nazev: e.target.value })}
                placeholder="Např. Hedvábné šaty Bellissima"
                className="w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-linda-espresso mb-1">Cena (Kč) *</label>
                <input
                  type="number"
                  required
                  value={form.cena}
                  onChange={(e) => setForm({ ...form, cena: e.target.value })}
                  placeholder="3490"
                  className="w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso"
                />
              </div>

              <div>
                <label className="block font-semibold text-linda-espresso mb-1">Akční cena (volitelně)</label>
                <input
                  type="number"
                  value={form.cenaPoSleve}
                  onChange={(e) => setForm({ ...form, cenaPoSleve: e.target.value })}
                  placeholder="2990"
                  className="w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-linda-espresso mb-1">Popis produktu *</label>
              <textarea
                rows={4}
                required
                value={form.popis}
                onChange={(e) => setForm({ ...form, popis: e.target.value })}
                placeholder="Popis střihu, stylu a vlastností..."
                className="w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso"
              />
            </div>
          </div>
        </div>

        {/* Section 6.2 Condition: Material & Care instructions (HIDDEN if jeDarkovyPoukaz === true) */}
        {!form.jeDarkovyPoukaz && (
          <div className="bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
            <h3 className="font-serif text-xl text-linda-espresso">Materiál &amp; Pokyny pro péči</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-linda-espresso mb-1">Materiál</label>
                <input
                  type="text"
                  value={form.material}
                  onChange={(e) => setForm({ ...form, material: e.target.value })}
                  placeholder="Např. 100% Přírodní italské hedvábí"
                  className="w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso"
                />
              </div>

              <div>
                <label className="block font-semibold text-linda-espresso mb-1">Údržba a péče</label>
                <input
                  type="text"
                  value={form.udrzba}
                  onChange={(e) => setForm({ ...form, udrzba: e.target.value })}
                  placeholder="Např. Šetrné ruční praní na 30°C"
                  className="w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-linda-espresso"
                />
              </div>
            </div>
          </div>
        )}

        {/* Async Photo Uploads with Sharp Worker Status (Sekce 3, 6.2, 9) */}
        <div className="bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
          <h3 className="font-serif text-xl text-linda-espresso">Fotografie (Asynchronní Sharp komprese)</h3>

          <div className="border-2 border-dashed border-linda-sand rounded-2xl p-6 text-center space-y-2 bg-linda-cream">
            <Upload className="w-8 h-8 text-linda-cognac mx-auto opacity-60" />
            <div className="text-xs text-linda-espresso">
              <label className="font-semibold text-linda-cognac cursor-pointer hover:underline">
                Vyberte fotky k nahrání
                <input type="file" multiple accept="image/*" onChange={handleSimulateUpload} className="hidden" />
              </label>
              <span> nebo přetáhněte sem</span>
            </div>
            <p className="text-[10px] text-linda-espresso/50">Worker na pozadí automaticky vygeneruje náhledy a převádí do WebP.</p>
          </div>

          {/* Uploaded photos status list */}
          {uploadedPhotos.length > 0 && (
            <div className="space-y-2 pt-2 text-xs">
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="p-3 bg-linda-cream rounded-xl border border-linda-sand flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-linda-cognac" />
                    <span className="font-medium text-linda-espresso">{photo.name}</span>
                  </div>

                  <div>
                    {photo.status === 'CEKA' && <span className="px-2.5 py-1 bg-linda-sandLight text-linda-espresso shadow-neuInsetSm rounded-full text-[10px] font-semibold">Čeká na zpracování</span>}
                    {photo.status === 'ZPRACOVAVA_SE' && <span className="px-2.5 py-1 bg-linda-sandLight text-linda-espresso shadow-neuInsetSm rounded-full text-[10px] font-semibold animate-pulse">Sharp komprese na pozadí...</span>}
                    {photo.status === 'HOTOVO' && <span className="px-2.5 py-1 bg-linda-sageLight text-linda-sage rounded-full text-[10px] font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Zpracováno (WebP)</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants & Measurements Editor */}
        <div className="bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl text-linda-espresso">
              {form.jeDarkovyPoukaz ? 'Hodnoty dárkového poukazu' : 'Varianty a konkrétní míry oblečení'}
            </h3>
            <button
              type="button"
              onClick={() =>
                setVariants([
                  ...variants,
                  {
                    id: String(Date.now()),
                    velikost: form.jeDarkovyPoukaz ? '1000 Kč' : 'M (38)',
                    skladem: 5,
                    obvodHrudniku: '92 cm',
                    obvodPasu: '72 cm',
                    obvodBoku: '98 cm',
                    delka: '116 cm',
                  },
                ])
              }
              className="px-3 py-1.5 bg-linda-cream border border-linda-sand text-xs font-semibold text-linda-cognac rounded-lg hover:bg-linda-cognac hover:text-white transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Přidat variantu
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((v, index) => (
              <div key={v.id} className="p-4 bg-linda-cream rounded-xl border border-linda-sand space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <label className="block font-semibold text-linda-espresso mb-1">
                        {form.jeDarkovyPoukaz ? 'Částka poukazu (např. 1000 Kč)' : 'Velikost'}
                      </label>
                      <input
                        type="text"
                        value={v.velikost}
                        onChange={(e) =>
                          setVariants(
                            variants.map((item, i) => (i === index ? { ...item, velikost: e.target.value } : item))
                          )
                        }
                        className="w-full bg-linda-sandLight rounded-lg px-3 py-2 text-linda-espresso shadow-neuInsetSm min-h-touch"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-linda-espresso mb-1">Počet kusů skladem</label>
                      <input
                        type="number"
                        value={v.skladem}
                        onChange={(e) =>
                          setVariants(
                            variants.map((item, i) => (i === index ? { ...item, skladem: Number(e.target.value) } : item))
                          )
                        }
                        className="w-full bg-linda-sandLight rounded-lg px-3 py-2 text-linda-espresso shadow-neuInsetSm min-h-touch"
                      />
                    </div>
                  </div>

                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                      className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-700 active:shadow-neuInsetSm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Section 6.2 Condition: Detailed measurements input (HIDDEN if jeDarkovyPoukaz === true) */}
                {!form.jeDarkovyPoukaz && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-linda-sand/40">
                    <div>
                      <label className="block font-medium text-linda-espresso/70 text-[11px]">Obvod hrudníku</label>
                      <input
                        type="text"
                        value={v.obvodHrudniku}
                        onChange={(e) =>
                          setVariants(variants.map((item, i) => (i === index ? { ...item, obvodHrudniku: e.target.value } : item)))
                        }
                        placeholder="88–92 cm"
                        className="w-full bg-linda-sandLight rounded-lg px-2.5 py-1.5 text-xs shadow-neuInsetSm min-h-touch"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-linda-espresso/70 text-[11px]">Obvod pasu</label>
                      <input
                        type="text"
                        value={v.obvodPasu}
                        onChange={(e) =>
                          setVariants(variants.map((item, i) => (i === index ? { ...item, obvodPasu: e.target.value } : item)))
                        }
                        placeholder="68–72 cm"
                        className="w-full bg-linda-sandLight rounded-lg px-2.5 py-1.5 text-xs shadow-neuInsetSm min-h-touch"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-linda-espresso/70 text-[11px]">Obvod boků</label>
                      <input
                        type="text"
                        value={v.obvodBoku}
                        onChange={(e) =>
                          setVariants(variants.map((item, i) => (i === index ? { ...item, obvodBoku: e.target.value } : item)))
                        }
                        placeholder="94–98 cm"
                        className="w-full bg-linda-sandLight rounded-lg px-2.5 py-1.5 text-xs shadow-neuInsetSm min-h-touch"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-linda-espresso/70 text-[11px]">Celková délka</label>
                      <input
                        type="text"
                        value={v.delka}
                        onChange={(e) =>
                          setVariants(variants.map((item, i) => (i === index ? { ...item, delka: e.target.value } : item)))
                        }
                        placeholder="115 cm"
                        className="w-full bg-linda-sandLight rounded-lg px-2.5 py-1.5 text-xs shadow-neuInsetSm min-h-touch"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/admin/produkty"
            className="px-6 min-h-touch bg-linda-cream text-xs font-semibold rounded-full shadow-neuSm hover:shadow-neu active:shadow-neuInsetSm transition-all duration-200 cursor-pointer text-linda-espresso"
          >
            Zrušit
          </Link>
          <button
            type="submit"
            className="px-8 min-h-touch bg-linda-cognac text-white text-xs font-semibold rounded-full hover:bg-linda-cognacHover shadow-neuDark transition-all duration-200 active:shadow-neuSm cursor-pointer"
          >
            Uložit produkt
          </button>
        </div>
      </form>
    </div>
  );
}
