import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        linda: {
          cream: '#FAF8F4',
          /* Podklad stránky – o půl tónu pod `cream`, přesně mezi ním
             a `sandLight`.

             Není to kosmetika, je to podmínka, aby reliéf vůbec fungoval.
             Klasický neumorfismus běží na středně šedé (#E0E5EC), protože
             vystouplá plocha musí ukázat obojí: tmavý stín vpravo dole
             i světlý přísvit vlevo nahoře. `cream` má ale L* ≈ 97,6, tedy
             prakticky bílou – nad ní žádné světlo nezbývá a bílá složka
             `neu*` tokenů (rgba(255,255,255,0.9)) se nemá do čeho opřít.
             Z reliéfu tak byla vidět jen půlka: obdélník se stínem dole,
             ne vypouklá plocha.

             `paper` posadí zem doprostřed mezi vyvýšené a zapuštěné plochy:
                vyvýšené  `cream`      #FAF8F4   ← světlejší než zem
                zem       `paper`      #F6F3EC
                zapuštěné `sandLight`  #F3EFE9   ← tmavší než zem
             Rozestup je v obou směrech skoro stejný, takže vystouplá karta
             i vyfrézovaná prohlubeň stojí proti zemi symetricky. */
          paper: '#F6F3EC',
          sand: '#E4D9C8',
          sandLight: '#F3EFE9',
          espresso: '#2B2019',
          espressoLight: '#3D2F25',
          cognac: '#7A4B32',
          cognacHover: '#633B26',
          sage: '#405023', // Presná nová olivová barva od uživatele
          sageLight: '#F1F4EB',
          sageHover: '#32401C',
          chocolate: '#3E2E25', // Hřejivá čokoládově hnědá – patička
          /* Neutrální šedá pro prvky chromu prohlížeče (táhlo scrollbaru).
             Záměrně bez hnědého i zeleného nádechu, aby nesoutěžila s brandem;
             kontrast na `cream` je 3.4:1, tedy nad hranicí pro UI prvky. */
          stone: '#8B857E',
          stoneHover: '#6E6862',
        },
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(43, 32, 25, 0.05)',
        elevated: '0 12px 30px -4px rgba(43, 32, 25, 0.08)',

        /* ------------------------------------------------------------------
           Měkký reliéf (soft UI / tlumené neumorfismus) pro domovskou stránku.

           Světlo přichází zleva shora: bílý přísvit vlevo nahoře, teplý
           espresso stín vpravo dole. Klasický neumorfismus jede na šedomodré
           #E0E5EC a na hraně čitelnosti – tady je záměrně utlumený:
           krytí stínu 0.08–0.12 místo obvyklých 0.25+, takže plocha jen
           „vystoupí“ z krémového podkladu a nikde nesnižuje kontrast textu.

           Povrch s tímto stínem musí mít stejnou barvu jako podklad
           (`linda-cream` na stránce, `linda-sandLight` uvnitř pískových
           panelů) – právě z toho reliéf žije. Barvu nikdy neředíme bílou.
        ------------------------------------------------------------------ */
        neu: '8px 8px 20px rgba(43, 32, 25, 0.10), -6px -6px 16px rgba(255, 255, 255, 0.95)',
        neuSm: '4px 4px 10px rgba(43, 32, 25, 0.08), -3px -3px 8px rgba(255, 255, 255, 0.9)',
        neuLg: '16px 16px 36px rgba(43, 32, 25, 0.12), -10px -10px 28px rgba(255, 255, 255, 1)',

        /* Vyvýšená plocha, která přesahuje přes fotku (rozcestník kategorií
           zanořený do heru). Bílý přísvit tu vynecháváme – nemá se do čeho
           opřít a na tmavém snímku z něj je mléčná svatozář kolem karty.
           Místo něj nese odsazení od fotky vrstvený espresso stín: úzký u
           hrany, široký a rozptýlený pod kartou. Rozostření je u obou vrstev
           větší než posun, takže stín obchází i boky a karta nad snímkem
           opravdu levituje. Vnitřní horní linka drží hranu vyvýšenou.

           Krytí držíme na úrovni ostatních `neu*` tokenů (0.06–0.12). Silnější
           varianta kreslila pod kartou tmavý pás, který na krémové sekci pod
           herem vypadal jako zašpiněné pozadí, ne jako stín. */
        neuFloat:
          '0 2px 5px rgba(43, 32, 25, 0.05), 0 8px 16px rgba(43, 32, 25, 0.07), 0 18px 38px rgba(43, 32, 25, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.9)',

        /* Konkávní varianty – „vyfrézovaná“ prohlubeň. Používáme na místa,
           kam se něco vkládá: obrázkové niky, vstupní pole, stisknutý stav. */
        neuInset:
          'inset 6px 6px 14px rgba(43, 32, 25, 0.13), inset -4px -4px 10px rgba(255, 255, 255, 1)',
        neuInsetSm:
          'inset 3px 3px 7px rgba(43, 32, 25, 0.08), inset -2px -2px 6px rgba(255, 255, 255, 0.9)',

        /* Tmavé plochy (espresso tlačítka) reliéf nedrží stejně – vlastní stín
           je na nich neviditelný. Místo přísvitu proto vnitřní horní linka. */
        neuDark:
          '8px 8px 18px rgba(43, 32, 25, 0.22), -6px -6px 16px rgba(255, 255, 255, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.14)',

        /* Reliéf *uvnitř* tmavého panelu (patička, admin postranní lišta).
           Bílý přísvit tu musí být sotva znatelný – na čokoládové by z 90%
           bílé byla mléčná šmouha, ne světlo. */
        neuOnDark: '5px 5px 12px rgba(0, 0, 0, 0.28), -3px -3px 9px rgba(255, 255, 255, 0.05)',
        neuOnDarkInset:
          'inset 4px 4px 10px rgba(0, 0, 0, 0.32), inset -3px -3px 8px rgba(255, 255, 255, 0.05)',

        /* Lišta přes celou šířku (hlavička). Boční složky stínu jsou mimo
           obrazovku, takže z reliéfu zbyde jen měkký spodní okraj – přesně
           to, co od sticky hlavičky chceme. */
        neuBar: '0 6px 18px rgba(43, 32, 25, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        neuBarRaised: '0 10px 26px rgba(43, 32, 25, 0.11), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },

        /* Naskočení počítadla (odznak košíku a oblíbených, potvrzovací hlášky).
           Mírný přestřel přes 1.0 je tu schválně: číslo se změní bez jakékoli
           jiné zpětné vazby – kliknutí proběhlo o stránku výš, u karty
           produktu – a plynulé prolnutí by v periferním vidění zaniklo.
           Přestřel je to, co oko zachytí, aniž by muselo na odznak koukat.
           Krátké (220 ms) a jednorázové, takže z toho není poskakující prvek. */
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.55)' },
          '60%': { opacity: '1', transform: 'scale(1.12)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        // 150–300ms podle UX pravidel; respektuje prefers-reduced-motion v globals.css
        fadeIn: 'fadeIn 200ms ease-out',
        fadeInUp: 'fadeInUp 250ms ease-out',
        popIn: 'popIn 220ms cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      minHeight: {
        touch: '44px', // WCAG minimální velikost dotykového cíle
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
