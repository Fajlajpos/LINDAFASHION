# Přístupnost — zák. č. 424/2023 Sb.

**Závěr: povinnost na tenhle e-shop nedopadá. Web ji přesto z velké části plní.**

---

## Proč se zákon neuplatní

Zákon č. 424/2023 Sb. o požadavcích na přístupnost výrobků a služeb (transpozice
směrnice (EU) 2019/882, účinný od **28. 6. 2025**) dopadá i na e-shopy. Vyjímá ale
**mikropodniky** — a výjimka platí jen tehdy, když jsou splněny **obě** podmínky
zároveň:

| Podmínka | Stav |
|---|---|
| Méně než 10 zaměstnanců | **Ano** — 2 osoby včetně majitelky |
| Roční obrat nebo bilanční suma nepřesahuje 2 mil. EUR | **Ano** |

Obě jsou splněny, výjimka tedy platí.

**Pozor na hranici.** Není to jednorázové posouzení: jakmile obchod vyroste přes
kterékoli z těch dvou čísel, povinnost začne platit. Nejpravděpodobnější spouštěč je
tady obrat, ne počet lidí. Až se k hranici obchod přiblíží, patří sem revize —
ne až v okamžiku, kdy ji překročí.

---

## Co web plní i bez povinnosti

Nejde o velkorysost. Přístupný web se lépe ovládá na mobilu, líp se čte na slunci
a nedělá rozdíl mezi zákaznicí s myší a bez ní.

- Kontrast textu nejméně 4,5 : 1, u velkého textu a ovládacích prvků 3 : 1.
- Viditelný prstenec fokusu na každém interaktivním prvku, definovaný globálně
  v `globals.css` — `focus:outline-none` se v projektu nepoužívá.
- Ovládání celé klávesnicí, logické pořadí fokusu.
- `aria-label` u tlačítek, která nesou jen ikonu; ikony jsou SVG, ne emoji.
- Sémantické značky a nadpisy, formulářová pole s viditelnými popisky
  (nikdy jen placeholder).
- Chybové hlášky u konkrétního pole, ne jen v souhrnu nahoře.
- Dotykové cíle nejméně 44 × 44 px.
- Respektuje se `prefers-reduced-motion`.
- Význam nikdy nenese pouze barva — stav doprovází text nebo tvar (například
  štítek lhůty u reklamace nese barvu, ikonu i slovní popis).
- Responzivní rozvržení bez vodorovného posuvu na 375 / 768 / 1024 / 1440 px,
  přiblížení není zakázané.

---

## Co by bylo potřeba doplnit, kdyby povinnost začala platit

1. **Prohlášení o přístupnosti** na webu, včetně popisu nesouladů a kontaktu pro
   podněty.
2. **Audit podle EN 301 549 / WCAG 2.1 AA** od někoho zvenčí, včetně testu
   s odečítačem obrazovky (NVDA, VoiceOver).
3. **Textové alternativy u všech produktových fotografií** — dnes se `alt`
   generuje z názvu produktu, což je lepší než nic, ale nepopisuje to střih,
   barvu ani detail.
4. **Průběžné hlášení** podle § 12 a spolupráce s dozorovým orgánem.

---

*Poslední revize: 18. 8. 2026. Reviduje se při změně počtu zaměstnanců nebo při
přiblížení obratu k 2 mil. EUR.*
