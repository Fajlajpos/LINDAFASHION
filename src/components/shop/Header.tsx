'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Heart, User, LayoutDashboard, Menu, X, Search, Sparkles, ChevronDown } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';
import { VyhledavaciPole } from '@/components/shop/VyhledavaciPole';
import type { KategorieNavigace } from '@/lib/katalog';

interface HeaderProps {
  user?: { jmeno?: string | null; email: string; role?: string | null } | null;
  vacationMode?: { active: boolean; message?: string | null };
  /** Hlavní kategorie z databáze v pořadí z administrace (`nacistNavigaci`). */
  kategorie?: KategorieNavigace[];
}

/* Kategorie míří na vlastní cestu `/produkty/[kategorie]`, ne na
   `?kategorie=` nad `/produkty`. Obojí vykresluje tentýž `KatalogVypis`, ale
   `<Link>` přednačítá podle cesty – odkazy s query parametrem vypadají jako
   jedna a táž `/produkty` a přednačetl by se nanejvýš jeden.

   Seznam kategorií přichází z databáze. Natvrdo tu bývaly „Šaty, Halenky,
   Svetry, Poukazy", které v databázi nebyly, a končily na „Stránka nebyla
   nalezena". Dvanáct kategorií se do řádku vedle loga nevejde, proto
   „Kolekce" na počítači rozbaluje panel. Speciální nabídka má vlastní
   položku – je to jediná kategorie, kterou má smysl mít na očích pořád. */
const SPECIALNI_NABIDKA = 'specialni-nabidka';

/** Počty nad 9 zkracujeme, aby se odznak nerozjel mimo ikonu. */
const formatBadge = (count: number) => (count > 9 ? '9+' : String(count));

/**
 * Vysoká hlavička s podtitulem je uvítání – patří k příchodu na titulní
 * stránku, kde je první obrazovka vizitka značky. Všude jinde už zákaznice
 * něco dělá (prohlíží kolekci, vybírá velikost, vyplňuje pokladnu) a lišta
 * je jen nářadí: 96 px na uvítání by tam ukrajovalo z obsahu a při prvním
 * skrolu by stejně sjelo do sbaleného tvaru. Sbalený tvar je proto výchozí
 * a rozevřený je výjimka pro `/`.
 *
 * Rozhoduje se podle cesty, ne podle skrolu, takže hlavička je sbalená hned
 * v prvním vykreslení – nepřeklopí se až po namontování a stránka pod ní
 * neposkočí.
 */
const jeKompaktniStranka = (pathname: string | null) => pathname !== '/';

export const Header: React.FC<HeaderProps> = ({
  user,
  vacationMode,
  kategorie = [],
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [kolekceOtevreno, setKolekceOtevreno] = useState(false);
  const specialniNabidka = kategorie.find((k) => k.slug === SPECIALNI_NABIDKA) ?? null;
  const [searchOpen, setSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  /* Sbalený tvar drží buď skrol, nebo samotná stránka. Skrolem se pak už jen
     nic nemění – mimo titulní stránku se lišta zpátky nahoře nerozevírá. */
  const pathname = usePathname();
  const isCompact = isScrolled || jeKompaktniStranka(pathname);

  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const kolekceRef = useRef<HTMLDivElement>(null);
  const kolekceTlacitkoRef = useRef<HTMLButtonElement>(null);
  const zavritKolekciCasovac = useRef<number | undefined>(undefined);
  /* Panel otevřený najetím myši: klik, který po najetí přijde, ho má nechat
     otevřený, ne zavřít. Myš totiž nejdřív najede a teprve pak klikne –
     prosté přepnutí panel otevřelo a vzápětí zavřelo. */
  const otevrenoNajetim = useRef(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Cart & Favorites Context
  const { totalItemCount: cartCount } = useCart();
  const { favoritesCount } = useFavorites();

  /* Zkratka do administrace. Do téhle chvíle se na `/admin` dalo dostat jedině
     ručním přepsáním adresy – po přihlášení tam sice míří přesměrování, ale
     kdo se pak proklikal do obchodu, cestu zpátky už neměl. */
  const jeAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      // Hystereze: zvětšit zpět až pod 12 px. Bez ní se lišta na hranici
      // jednoho prahu překlápěla tam a zpět a přechod se pořád restartoval.
      setIsScrolled((prev) => (prev ? y > 12 : y > 40));
    };

    const handleScroll = () => {
      // Scroll umí přijít několikrát za snímek; rAF sloučí náraz událostí
      // do jediného přepočtu, takže React nepřekresluje hlavičku zbytečně.
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    // Přeměření i při změně cesty: App Router po navigaci odroluje nahoru,
    // ale když stránka na nule už byla, žádná událost skrolu nepřijde a
    // `isScrolled` by si drželo hodnotu z předchozí stránky – návrat na
    // titulní by pak zůstal sbalený.
    measure();
    // passive: scroll handler nikdy nevolá preventDefault, prohlížeč tak
    // nemusí čekat a scrollování zůstává plynulé
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  /* Escape zavře mobilní menu. Hledání tu schválně **není**: má Escape
     dvoukrokový (nejdřív nabídka návrhů, pak celé pole) a to rozhodnutí musí
     dělat jediné místo – `VyhledavaciPole`. Dva posluchače na `document`
     si navzájem nepřebijí: React v App Routeru hydratuje celý dokument,
     takže i jeho delegované posluchače sedí na `document` a `stopPropagation`
     mezi sourozenci na témž uzlu nic nezastaví. */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileMenuOpen(false);
      menuToggleRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  /* Panel kolekcí: navigace ho zavře (klik na odkaz mění cestu), stejně jako
     Escape a klik mimo. Najetí myší ho jen otevírá jako zkratku – hlavní cesta
     je klik, jinak by se na dotykovém notebooku nedal otevřít vůbec. */
  useEffect(() => {
    setKolekceOtevreno(false);
  }, [pathname]);

  useEffect(() => {
    if (!kolekceOtevreno) {
      otevrenoNajetim.current = false;
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setKolekceOtevreno(false);
      kolekceTlacitkoRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!kolekceRef.current?.contains(event.target as Node)) setKolekceOtevreno(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [kolekceOtevreno]);

  useEffect(() => () => window.clearTimeout(zavritKolekciCasovac.current), []);

  /* Myš panel otevře najetím a zavře s malou prodlevou – přejezd z tlačítka
     do panelu přes mezeru by ho jinak zavřel dřív, než do něj kurzor dojede. */
  const najetiNaKolekci = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(zavritKolekciCasovac.current);
    if (!kolekceOtevreno) otevrenoNajetim.current = true;
    setKolekceOtevreno(true);
  };
  const odjetiZKolekce = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    zavritKolekciCasovac.current = window.setTimeout(() => setKolekceOtevreno(false), 200);
  };

  /* Fokus do pole si řeší `VyhledavaciPole` samo: montuje se až otevřením,
     takže „fokus po namountování“ je totéž co „fokus po otevření“ – a hlavička
     kvůli tomu nemusí držet ref do cizí komponenty.
     `useCallback`: pole si funkci věší na posluchač Escape, a hlavička se
     překresluje při každém skrolu – bez stabilní identity by se posluchač
     přepínal desetkrát za vteřinu. */
  const zavritHledani = useCallback(() => {
    setSearchOpen(false);
    searchToggleRef.current?.focus();
  }, []);

  return (
    <header
      /* Krémová jako stránka a bez spodní linky – hlavičku od obsahu odděluje
         měkký reliéf, který se skrolem prohloubí (lišta se „zvedne“). */
      /* Jen `transition-shadow`: `transition-all` spolu s přepínáním `py`
         rozjelo druhou, konkurenční animaci výšky vedle té na vnitřní mřížce
         – lišta pak při skrolu poskakovala. Výšku mění jediné místo. */
      className={`sticky top-0 z-40 bg-linda-cream transition-shadow duration-300 ${
        isCompact ? 'shadow-neuBarRaised' : 'shadow-neuBar'
      }`}
    >
      {/* Vacation mode banner */}
      {vacationMode?.active && (
        <div className="bg-linda-cognac text-linda-cream text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{vacationMode.message || 'Momentálně čerpáme dovolenou. Objednávky přijímáme a expedujeme ihned po návratu.'}</span>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* 3-Column Grid with Shrinking Height on Scroll */}
        {/* Pod `lg` jde o flex: pevná mřížka 3/6/3 dávala ikonám jen ~86 px,
            ačkoli čtyři dotykové cíle po 44 px potřebují 176 – ikony proto
            přetékaly doleva přes logo. Ve flexu si krajní bloky vezmou, co
            potřebují, a logo dostane zbytek. Od `lg` zůstává mřížka 4/4/4. */}
        <div
          className={`flex items-center justify-between gap-2 transition-[height] duration-300 ease-out lg:grid lg:grid-cols-12 ${
            isCompact ? 'h-16' : 'h-24'
          }`}
        >
          {/* Left Column: Nav links.
              Sloupce jsou 4/4/4 (dřív 5/2/5) – na 1024 px měl střed jen ~160 px
              a logo přetékalo pod odkaz „O mně“. */}
          <div className="flex shrink-0 items-center justify-start lg:col-span-4 lg:pl-0 xl:pl-8">
            {/* Mobile menu button */}
            <button
              ref={menuToggleRef}
              type="button"
              /* Otevřením menu se zavře hledání a naopak. Oba panely rostou
                 uvnitř `sticky` hlavičky, takže otevřené najednou daly dohromady
                 ~470 px – na telefonu na šířku víc, než je celá obrazovka. */
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setSearchOpen(false);
              }}
              className="min-h-touch min-w-touch flex items-center justify-center cursor-pointer text-linda-espresso hover:text-linda-cognac transition-colors lg:hidden"
              aria-label={mobileMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobilni-menu"
            >
              {/* Obě ikony leží na sobě a přepínají se pootočením s prolnutím.
                  Dřív se jedna odmountovala a druhá naskočila skokem – u prvku,
                  který má oznámit „stav se přepnul“, je ta čtvrtsekunda pohybu
                  celá informace. Rozměr drží obal, ne ikony, takže se lišta
                  během přechodu nehne. */}
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Menu
                  className={`absolute h-6 w-6 transition-all duration-200 ease-out ${
                    mobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                  }`}
                  aria-hidden="true"
                />
                <X
                  className={`absolute h-6 w-6 transition-all duration-200 ease-out ${
                    mobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav
              aria-label="Hlavní navigace"
              className="hidden lg:flex items-center gap-1.5 xl:gap-4 text-[11px] xl:text-xs font-medium tracking-wider uppercase text-linda-espresso whitespace-nowrap"
            >
              {kategorie.length === 0 ? (
                <Link href="/produkty" className="rounded-full py-2 transition-colors duration-200 hover:text-linda-cognac">
                  Kolekce
                </Link>
              ) : (
                <div
                  ref={kolekceRef}
                  className="relative"
                  onPointerEnter={najetiNaKolekci}
                  onPointerLeave={odjetiZKolekce}
                >
                  <button
                    ref={kolekceTlacitkoRef}
                    type="button"
                    onClick={() => {
                      if (kolekceOtevreno && otevrenoNajetim.current) {
                        otevrenoNajetim.current = false;
                        return;
                      }
                      otevrenoNajetim.current = false;
                      setKolekceOtevreno((o) => !o);
                    }}
                    aria-expanded={kolekceOtevreno}
                    aria-controls="panel-kolekci"
                    className={`flex cursor-pointer items-center gap-1 rounded-full py-2 uppercase tracking-wider transition-colors duration-200 hover:text-linda-cognac ${
                      kolekceOtevreno ? 'text-linda-cognac' : ''
                    }`}
                  >
                    Kolekce
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${kolekceOtevreno ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Krémová karta se `shadow-neuFloat`: leží přes fotku v heru, kde bílé
                      světlo z `neuLg` maluje kolem karty mléčnou svatozář. `pt-3`
                      na obalu je neviditelný most mezi tlačítkem a kartou –
                      kurzor jím projede, aniž by opustil oblast panelu. */}
                  {kolekceOtevreno && (
                    <div id="panel-kolekci" className="absolute left-0 top-full z-50 pt-3">
                      <div className="animate-fadeIn w-[30rem] rounded-2xl bg-linda-cream p-3 normal-case tracking-normal shadow-neuFloat">
                        <Link
                          href="/produkty"
                          onClick={() => setKolekceOtevreno(false)}
                          className="flex min-h-touch items-center justify-between rounded-xl px-4 font-serif text-lg text-linda-espresso transition-all duration-200 hover:bg-linda-sandLight hover:text-linda-cognac hover:shadow-neuInsetSm"
                        >
                          Celý katalog
                          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-linda-cognac">
                            Vše
                          </span>
                        </Link>
                        <ul className="mt-1 grid grid-cols-2 gap-0.5 border-t border-linda-sand/50 pt-2">
                          {kategorie.map(({ nazev, slug }) => {
                            const aktivni = pathname === `/produkty/${slug}`;
                            return (
                              <li key={slug}>
                                <Link
                                  href={`/produkty/${slug}`}
                                  onClick={() => setKolekceOtevreno(false)}
                                  aria-current={aktivni ? 'page' : undefined}
                                  className={`flex min-h-touch items-center rounded-xl px-4 text-sm font-medium transition-all duration-200 hover:bg-linda-sandLight hover:shadow-neuInsetSm ${
                                    slug === SPECIALNI_NABIDKA
                                      ? 'text-linda-cognac hover:text-linda-cognacHover'
                                      : 'text-linda-espresso hover:text-linda-cognac'
                                  } ${aktivni ? 'bg-linda-sandLight shadow-neuInsetSm' : ''}`}
                                >
                                  {nazev}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {specialniNabidka && (
                <Link
                  href={`/produkty/${specialniNabidka.slug}`}
                  className="rounded-full py-2 text-linda-cognac transition-colors duration-200 hover:text-linda-cognacHover"
                >
                  {specialniNabidka.nazev}
                </Link>
              )}

              {/* Hover je jen přebarvení do cognacu – nic dalšího.
                  `rounded-full` je kvůli globálnímu `:focus-visible` prstenci,
                  aby při procházení klávesnicí obepnul slovo. */}
              <Link href="/o-mne" className="rounded-full py-2 transition-colors duration-200 hover:text-linda-cognac">
                O mně
              </Link>
              <Link href="/kontakt" className="rounded-full py-2 transition-colors duration-200 hover:text-linda-cognac">
                Kontakt
              </Link>
            </nav>
          </div>

          {/* Center Column: Centered Brand Logo */}
          {/* `overflow-hidden`: pod ~350 px už na logo místo není (menu + čtyři
              ikony po 44 px sežerou skoro celou šířku). Raději ať se ořízne,
              než aby přeteklo přes ikony. Od 360 px se vejde celé. */}
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-1 text-center lg:col-span-4 lg:flex-none lg:px-2">
            <Link href="/" className="inline-block group text-center rounded-sm" aria-label="LINDA FASHION – domovská stránka">
              <span
                /* Na 375 px má prostřední sloupec jen ~170 px. Logo proto na
                   nejmenších displejích zmenšujeme a stahujeme prostrkání,
                   jinak přeteče pod ikony vpravo. */
                /* `whitespace-nowrap` až od `sm`. Na velmi úzkých displejích
                   se tak nápis raději zalomí na dva řádky, než aby se ořízl. */
                /* Zmenšení řešíme `scale`, ne `font-size` + `letter-spacing`:
                   ty dvě vlastnosti nutí prohlížeč přesázet text v každém
                   snímku (layout + paint), což byl hlavní zdroj trhání.
                   `scale` běží na kompozitoru. Poměry odpovídají původním
                   velikostem – sm 24→20 px (0.833), xl 30→24 px (0.8). */
                className={`font-serif uppercase font-medium text-linda-espresso group-hover:text-linda-cognac transition-[transform,color] duration-300 ease-out block origin-center transform-gpu text-[13px] tracking-[0.05em] sm:whitespace-nowrap sm:text-2xl sm:tracking-[0.14em] xl:text-3xl xl:tracking-[0.2em] ${
                  isCompact ? 'scale-100 sm:scale-[0.833] xl:scale-[0.8]' : 'scale-100'
                }`}
              >
                LINDA FASHION
              </span>
              {/* Podtitul zůstává v DOM a jen se sbalí. Dřív se odmountoval,
                  takže zmizel skokem uprostřed přechodu hlavičky.
                  Na telefonu (pod `sm`) se nezobrazuje vůbec – v úzkém
                  prostředním sloupci stačí samotné LINDA FASHION. */}
              <span
                aria-hidden={isCompact}
                className={`hidden sm:block overflow-hidden -mt-1 text-[9px] tracking-[0.35em] text-linda-sage uppercase font-sans font-semibold transition-[max-height,opacity] duration-300 ease-out ${
                  isCompact ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100'
                }`}
              >
                Moda Italiana
              </span>
            </Link>
          </div>

          {/* Right Column: Action icons */}
          <div className="flex shrink-0 items-center justify-end gap-0 text-linda-espresso sm:gap-1 lg:col-span-4 lg:gap-2">
            {/* Search */}
            <button
              ref={searchToggleRef}
              type="button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                setMobileMenuOpen(false);
              }}
              className="group min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors"
              aria-label={searchOpen ? 'Zavřít vyhledávání' : 'Otevřít vyhledávání'}
              aria-expanded={searchOpen}
              aria-controls="vyhledavani"
            >
              {/* Ikony v liště reagují jednotně: nadechnutí při najetí,
                  stlačení při stisku. Dotykový cíl (44 px) se nemění, pohyb
                  má jen kresba uvnitř – jinak by se sousední ikony strkaly. */}
              <Search
                className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
            </button>

            {/* Favorites */}
            <Link
              href="/oblibene"
              className="group min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors relative"
              aria-label={
                favoritesCount > 0
                  ? `Oblíbené položky (${favoritesCount})`
                  : 'Oblíbené položky'
              }
            >
              <Heart
                className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
              {favoritesCount > 0 && (
                <span
                  aria-hidden="true"
                  /* `key` na počtu je celý smysl: bez něj React jen přepíše
                     text uvnitř téhož uzlu a animace, která se pouští při
                     namountování, se podruhé nespustí. S ním odznak při každé
                     změně počtu znovu naskočí – přidání do oblíbených se dělo
                     o stránku níž a jinak by o něm lišta mlčela. */
                  key={favoritesCount}
                  className="animate-popIn absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-linda-cognac text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold"
                >
                  {formatBadge(favoritesCount)}
                </span>
              )}
            </Link>

            {/* Administrace – jen pro majitelku.
                Vyvýšená pilulka v krémové liště: je to jediný prvek hlavičky,
                který má vystoupit, takže reliéf nese význam. Pod `lg` se
                schovává, tam už čtyři dotykové cíle po 44 px zabírají skoro
                celou šířku – na malých displejích vede do administrace
                položka v rozbalovacím menu. */}
            {jeAdmin && (
              <Link
                href="/admin"
                className="group hidden min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm lg:flex"
              >
                <LayoutDashboard
                  className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                  aria-hidden="true"
                />
                Administrace
              </Link>
            )}

            {/* Account / Admin */}
            <Link
              href={user ? '/muj-ucet' : '/prihlaseni'}
              className="group min-h-touch flex items-center justify-center gap-1.5 px-2 cursor-pointer rounded-full hover:text-linda-cognac transition-colors"
              aria-label={user ? 'Můj účet' : 'Přihlásit se'}
            >
              <User
                className="w-5 h-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
              {user && (
                <span className="hidden md:inline text-xs font-medium max-w-[90px] truncate">
                  {user.jmeno || user.email.split('@')[0]}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/kosik"
              className="min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors relative group"
              aria-label={
                cartCount > 0
                  ? `Košík (${cartCount} ${cartCount === 1 ? 'položka' : cartCount < 5 ? 'položky' : 'položek'})`
                  : 'Košík je prázdný'
              }
            >
              <ShoppingBag
                className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  // `key` na počtu – viz odznak oblíbených výš.
                  key={cartCount}
                  className="animate-popIn absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-linda-cognac text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold"
                >
                  {formatBadge(cartCount)}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Hledání s našeptávačem. Vlastní komponenta, ne dalších sto řádků
            v hlavičce: drží si prodlevu, rušení předchozího dotazu, ovládání
            klávesnicí i stavy nabídky. */}
        {searchOpen && <VyhledavaciPole onZavrit={zavritHledani} />}
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <nav
          id="mobilni-menu"
          aria-label="Mobilní navigace"
          /* Zásuvka je uvnitř `sticky top-0` hlavičky, a přilepený prvek vyšší
             než okno má nedosažitelný spodek. Sedm položek po 44 px dá ~340 px,
             s odkazem do administrace ~390 – na telefonu na šířku (375 px) se
             tedy na „Kontakt & Showroom“ nedalo dostat vůbec.
             `6rem` je výška lišty nad zásuvkou v rozbaleném stavu (změřeno:
             96 px nahoře na stránce, 64 px po sbalení při skrolu). Bereme tu
             vyšší z obou – v tom druhém případě zásuvka jen nevyužije 32 px,
             což je bezpečný směr. `dvh` proto, že se adresní řádek v mobilních
             prohlížečích sbaluje a `vh` na to nereaguje.
             `overscroll-contain` drží skrol uvnitř zásuvky. */
          className="animate-fadeIn max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain bg-linda-cream px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 text-center text-xs font-medium uppercase tracking-wider text-linda-espresso shadow-neuBarRaised lg:hidden"
        >
          {/* Administrace nahoře a oddělená – není to část nabídky obchodu,
              ale vstup jinam. V liště se pilulka pod `lg` nevejde. */}
          {jeAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-2 flex min-h-touch items-center justify-center gap-2 rounded-full bg-linda-cream font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 active:shadow-neuInsetSm"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
              Administrace
            </Link>
          )}

          <Link
            href="/produkty"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-touch items-center justify-center border-b border-linda-sand/40"
          >
            Celý katalog
          </Link>

          {/* Kategorie ve dvou sloupcích a bez verzálek: dvanáct řádků pod
              sebou by zásuvku natáhlo přes dvě obrazovky a „Kalhoty a džíny"
              ve verzálkách s prostrkáním by se na půl šířky nevešly. */}
          {kategorie.length > 0 && (
            <ul
              aria-label="Kategorie"
              className="grid grid-cols-2 gap-x-2 border-b border-linda-sand/40 py-2 text-sm normal-case tracking-normal"
            >
              {kategorie.map(({ nazev, slug }) => {
                const aktivni = pathname === `/produkty/${slug}`;
                return (
                  <li key={slug}>
                    <Link
                      href={`/produkty/${slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={aktivni ? 'page' : undefined}
                      className={`flex min-h-touch items-center justify-center rounded-xl px-2 transition-all duration-200 active:bg-linda-sandLight active:shadow-neuInsetSm ${
                        slug === SPECIALNI_NABIDKA ? 'font-semibold text-linda-cognac' : ''
                      } ${aktivni ? 'bg-linda-sandLight shadow-neuInsetSm' : ''}`}
                    >
                      {nazev}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/o-mne"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-h-touch items-center justify-center border-b border-linda-sand/40"
          >
            O mně
          </Link>
          <Link
            href="/kontakt"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center min-h-touch"
          >
            Kontakt &amp; Showroom
          </Link>
        </nav>
      )}
    </header>
  );
};
