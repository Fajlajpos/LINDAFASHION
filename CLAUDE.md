# CLAUDE.md

Project rules for LINDA FASHION. Global UI/UX rules and the `ui-ux-pro-max` skill live in
`~/.claude/CLAUDE.md` and `~/.claude/skills/ui-ux-pro-max/` — they apply here automatically.
This file only records what is **specific to this project** and overrides the global rules.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma/Postgres e-shop, Czech UI.
[src/app/](src/app/) routes · [src/components/](src/components/) (`shop/`, `ui/`, `admin/`) ·
[src/lib/](src/lib/) · [src/worker/](src/worker/) (pg-boss) · [prisma/](prisma/).

When querying the skill, always pass `--stack nextjs`.

## Backend — three runtimes, three import rules

The same `src/` tree is compiled for three different runtimes. Putting code in the wrong
file breaks a build that looks unrelated, so the split is deliberate:

| runtime | what runs there | must not import |
|---|---|---|
| **Edge** ([middleware.ts](src/middleware.ts)) | session signature check only | Prisma, bcrypt, `node:*` |
| **Node / Next** (route handlers, Server Components) | everything else | — |
| **Node / worker** ([src/worker/](src/worker/), built by [tsconfig.worker.json](tsconfig.worker.json)) | Sharp, queue jobs | `next/*`, alias `@/` |

Consequences worth remembering:

- [session.ts](src/lib/session.ts) is Edge-safe (`jose` only) — middleware imports it.
- [hesla.ts](src/lib/hesla.ts) holds bcrypt separately from [auth.ts](src/lib/auth.ts),
  because `auth.ts` imports `next/headers`, which the worker cannot load.
- **Worker code uses relative imports** (`../lib/db`), never `@/` — `tsc` does not rewrite
  path aliases in its output, so an alias compiles fine and then throws at runtime.
- Auth is a **custom JWT session in an HttpOnly cookie**, not NextAuth. Admins are ordinary
  `User` rows with `role = ADMIN`; `.env` only bootstraps the first one.
- pg-boss: `schedule(name, cron)` takes **no handler**. A scheduled queue needs a matching
  `work(name, handler)` or the job is enqueued and never picked up.
- Image processing runs **only in the worker**. Never call
  [sharp-image.ts](src/lib/sharp-image.ts) from a route handler.
  **`npm run dev` therefore starts web *and* worker** ([dev.mjs](src/scripts/dev.mjs));
  `dev:web` is the escape hatch. Without the worker a photo uploads fine, sits in
  `CEKA` forever and the admin looks like a broken upload — that happened twice
  before the launcher existed, and cost a deleted photo. `SpravaFotek` now says so
  out loud after a minute of waiting instead of spinning a reassuring spinner.
- API errors use the shape `{ chyba, pole? }` so forms can put the message next to the
  offending field — see [api.ts](src/lib/api.ts). `zpracovatChybu` maps `SyntaxError` to
  400: a broken request body is the caller's fault, and it used to surface as a 500 that
  blamed the server and filled the log.
- **Every `force-dynamic` route needs a `loading.tsx`**, and practically every route here is
  `force-dynamic`. Without one the App Router has nothing to show during a transition: the
  old page just sits there until the server finishes, so a 60 ms navigation still reads as
  a hang. Worse, `<Link>` prefetch only reaches **as far as the nearest loading boundary** —
  with no boundary a dynamic route cannot be prefetched at all and every click is a cold
  round trip. Skeletons live in [Kostra.tsx](src/components/ui/Kostra.tsx) and follow the
  relief rules: ground → raised `cream` card → `sandLight` grooves inside it.
  (Prefetch is disabled in `next dev` by design — measure this on `next build && next start`.)
- **Category links use the path `/produkty/[kategorie]`, never `?kategorie=`.** Both render
  the same `KatalogVypis`, but prefetch keys off the path: five nav items pointing at
  `/produkty?kategorie=…` look like one and the same route to the router.
- **Error boundaries:** [(shop)/error.tsx](<src/app/(shop)/error.tsx>) keeps the header and
  footer so the customer can navigate away; [app/error.tsx](src/app/error.tsx) is the
  fallback for admin/auth; [global-error.tsx](src/app/global-error.tsx) catches a failure in
  the root layout itself and therefore carries its own `html`/`body` and inline colours —
  the one place raw hex is allowed, because `next/font` and the token stylesheet are exactly
  what has failed. All three surface only `error.digest`, never the exception message: it
  can carry a table name or a host. An unreachable database is the usual trigger — every
  `findMany` in a Server Component throws and takes the page with it.
  **Testing them needs a browser and a production build**: `next start` sends an empty shell
  and renders the boundary on the client, so `curl` sees only scripts.
- **Search runs on `Product.hledaciText` / `Category.hledaciNazev`, never on `nazev`.**
  Both hold the text lowercased and stripped of diacritics, because a customer
  types "saty" and the product is called "Hedvábné šaty". Every write of a product
  or category must refill them through
  [vyhledavani.ts](src/lib/vyhledavani.ts) (`hledaciTextProduktu`,
  `hledaciNazevKategorie`) — a row saved without them stays in the catalog but
  cannot be found. The same file tokenizes the query, so both sides of the
  comparison go through one function; if they ever diverge, search silently stops
  matching. Normalization doubles as sanitization: nothing but `[a-z0-9]` survives
  it, so `%` and `_` can never reach the `LIKE` pattern.
  The column is deliberately unindexed — `LIKE '%x%'` cannot use a B-tree, and a
  boutique catalog is cheaper to scan than to add `pg_trgm` for.
- **Combine the search condition with other filters through `AND`, never by
  spreading keys.** Both the category filter and the search touch `category` and
  both use `OR`; spreading them into one object makes the second silently
  overwrite the first, and `/produkty/saty?hledat=len` searches the whole catalog.
  Covered by [katalog.integration.test.ts](src/lib/katalog.integration.test.ts).
- **Never `in`-test a parsed request body without checking it is an object first.**
  `request.json()` happily returns `null`, a number or a string, and `'x' in 5` throws.
- **Worker-safe legal libs.** [lhuty.ts](src/lib/lhuty.ts) and
  [retence.ts](src/lib/retence.ts) use relative imports and no `next/*` — the worker runs
  the retention job and the queue jobs compute deadlines. Keep them that way.
- Admin lists are paginated through [Strankovani.tsx](src/components/ui/Strankovani.tsx)
  (`?stranka=`, windowed page numbers). Counts in the headings come from `count()`, not
  from the length of the rendered page — that used to report "200 registrovaných účtů"
  no matter how many there really were.
- `binaryTargets` in [schema.prisma](prisma/schema.prisma) must keep
  `linux-musl-openssl-3.0.x`. Without it the Docker image **builds fine and then dies on
  the first query** with `Error loading shared library libssl.so.1.1` — Prisma guesses the
  OpenSSL 1.1 engine, which current Alpine no longer ships. `openssl` is installed in the
  image so Prisma can detect the version instead of guessing.

## Design system — existing tokens win

The brand is already defined. The skill **advises**; it does not redecide the brand.
Do not swap the palette or fonts for something the skill suggests — use its output for
layout, UX, accessibility and to fill genuine gaps, then add the gap as a token.

- **Colors:** `linda.*` in [tailwind.config.ts](tailwind.config.ts) — `cream`, `paper`,
  `sand`, `sandLight`, `espresso`, `espressoLight`, `cognac`, `cognacHover`, `sage`,
  `sageLight`, `sageHover`, `chocolate`. Use `bg-linda-cognac`, `text-linda-espresso`, … —
  **never raw hex in components.**
- **The ground:** `paper` (`#F6F3EC`) is the page background, set once on `html`/`body` in
  [globals.css](src/styles/globals.css). Layouts must **not** paint over it — that is why
  [(shop)/layout.tsx](<src/app/(shop)/layout.tsx>) carries no `bg-*`. It sits deliberately
  between the raised and recessed surfaces so the relief has headroom in both directions:

  | role | token | measured luma |
  |---|---|---|
  | raised — cards, header | `cream` | 245 |
  | **ground** | `paper` | **241** |
  | recessed — trust bar, inputs, panels | `sandLight` | 238 |

  Seven levels is the entire budget. **Never put a gradient on the page background** —
  measured, a light pool either moves the ground by one level (invisible) or by three,
  which drops it onto `sandLight` and makes every recessed panel in that region vanish.
  Material belongs on the ground as grain, not as light.
- **Typography:** `font-serif` = Cormorant Garamond, `font-sans` = Plus Jakarta Sans, loaded
  through `next/font/google` in [src/app/layout.tsx](src/app/layout.tsx). Do not add font
  families and do not reintroduce `@import` font loading in CSS.
- **Shadows / reliéf:** the whole site runs on a **tlumený neumorfismus** (soft UI).
  Surfaces share the page colour and are separated by shadow alone — see the `neu*` tokens
  in [tailwind.config.ts](tailwind.config.ts). Light comes from the top left.
  - Raised: `shadow-neuSm` · `shadow-neu` · `shadow-neuLg` on `bg-linda-cream`.
  - Recessed: `shadow-neuInsetSm` / `shadow-neuInset` on `bg-linda-sandLight` — use for
    anything you *put something into*: inputs, image niches, progress grooves, read-only
    data panels, status chips, the selected item of a segmented control.
  - Dark surfaces: `shadow-neuDark` for espresso/cognac buttons on a light page;
    `shadow-neuOnDark` / `shadow-neuOnDarkInset` for elements **inside** a dark panel
    (footer, admin sidebar). Never put a light-source highlight at 0.9 white on chocolate.
  - Full-width bars (header): `shadow-neuBar` → `shadow-neuBarRaised` when scrolled.
  - Surfaces **overlapping a photo** (category card sunk into the hero): `shadow-neuFloat`.
    It drops the white highlight — over a dark image the highlight has nothing to sit on
    and paints a milky halo around the element. Only the warm espresso drop shadow is left.
  - **Grain:** a `feTurbulence` noise layer on `body::before` (fixed, `multiply`, 0.15)
    gives the flat ground material. Opacity is measured, not guessed — turbulence returns
    variable alpha, so 0.05 yields a 4/255 spread (invisible) and 0.15 yields ~12. It is
    `fixed` on purpose: grain that scrolls reads as wallpaper, grain that stays reads as
    the paper the page is printed on.
  - **Never nest a recess in a recess.** A groove inside a groove has nowhere to go in the
    seven-level budget. Put a raised `cream` card in between first, then the
    `sandLight` groove inside it — ground → raised → recessed, in that order.
    (The "notify me when back in stock" form sat directly in the recessed sold-out panel.)
  - **A label inside a stateful element must change colour with the state.** The
    "Poslední kousky" hint was `text-linda-cognac` regardless of selection, so on the
    selected cognac tile it was cognac-on-cognac — the warning vanished exactly when the
    customer picked that size. Same trap for anything on `espresso`/`cognac`/`chocolate`.
  - **Rules:** a raised surface must match its background colour — never lighten it.
    (Exception, and the only one: the page ground itself is `paper`, one step *below*
    `cream`. Without that step the white component of every `neu*` token has nothing to
    sit on and only the dark half of the relief renders.)
    Never combine a border with a relief shadow; that outlines the same edge twice.
    Buttons pair `shadow-neuDark` with `active:shadow-neuSm` so pressing them reads
    physically. Keep `transition-all duration-200`.
  - `shadow-card` / `shadow-elevated` are the older flat tokens — kept for anything not yet
    converted, but new work should use `neu*`.
- **Animations:** `animate-fadeIn`, `animate-fadeInUp` (200–250ms).
  **Touch targets:** `min-h-touch` / `min-w-touch` (44px).
- **Focus:** a global `:focus-visible` ring is defined in
  [src/styles/globals.css](src/styles/globals.css) using `box-shadow`. Never remove it; do
  not add per-component focus rings that fight it. Note it *replaces* a `neu*` shadow while
  focused — that is intended, the ring must win.
- **Reduced motion:** globally handled in `globals.css`. New animations need no extra guard.

## Conventions

- Server Components by default; `'use client'` only where interactivity requires it.
- `next/image` for all images, never `<img>`. Lucide for icons, never emoji.
- **No native `<select>` — use [Vyber.tsx](src/components/ui/Vyber.tsx).** The trigger styles
  fine, but the *dropped-down list is drawn by the operating system*: a grey Windows menu with
  a blue bar, system font and square corners, in the middle of the cream relief. `appearance:
  none` cannot reach it and `<option>` takes almost no styling anywhere. `Vyber` renders the
  list itself in the same vocabulary as the search suggestions (raised `cream` card, active
  item sunk into it), through a portal so it is never clipped by an ancestor, and it opens
  upward when the window has no room below. The portal is **`position: absolute` in document
  coordinates, never `fixed`** — a fixed menu has to be dragged back to its field on every
  scroll event, and the browser scrolls on the compositor thread, so it visibly swam around
  the field no matter how the chasing was written. Anchored in the document, the page scrolls
  menu and field together in one movement. Scrolling further than a nudge then **closes** the
  menu — the field itself disappears under the sticky header (`z-40`) while the menu above it
  (`z-50`) would stay hanging over the header, attached to nothing. Keyboard follows the WAI-ARIA
  select-only combobox: arrows, Home/End, Enter, Escape and typeahead. Native `required`
  disappears with the native element — the server check (`{ chyba, pole }`) is what enforces
  the field, `povinne` only sets `aria-required`.
- Czech copy throughout, including `aria-label`s.
- Czech number formatting: `.toLocaleString('cs-CZ')`.

## Tests — two suites, on purpose

| příkaz | co spustí | potřebuje Postgres |
|---|---|---|
| `npm test` | jednotkové testy nad čistou logikou | ne |
| `npm run test:integration` | testy nad skutečnou databází | ano |
| `npm run test:vse` | obojí | ano |

`npm test` **musí projít i bez databáze** — jinak si nikdo netroufne testy pustit.
Integrační testy proto mají vlastní `vitest.integration.config.ts` a výchozí
konfigurace je vylučuje.

- **Integrační testy mažou tabulky** (`TRUNCATE`). Jedinou pojistkou proti smazání
  vývojové databáze je [testovaci-databaze.ts](src/test/testovaci-databaze.ts):
  název databáze **musí končit na `_test`**, jinak se testy odmítnou spustit.
  Ta pojistka má vlastní testy — neruš je.
- Databázi (`linda_fashion_test`) i migrace do ní zařídí
  [global-setup.ts](src/test/global-setup.ts) sám. Stačí běžící
  `docker compose -f docker-compose.dev.yml up -d`.
- **Testy běží po souborech, ne paralelně** (`fileParallelism: false`). Některé
  schválně pouštějí několik objednávek naráz, aby ověřily souběh; druhý soubor
  nad toutéž databází by výsledky přebíjel a testy by padaly náhodně.
- `nastaveni.ts` používá `cache()` z Reactu, které je jen v serverovém buildu.
  [setup-integration.ts](src/test/setup-integration.ts) ho nahrazuje průchozí
  funkcí **bez memoizace** — testy si mezi případy mění nastavení e-shopu
  a s memoizací by četly hodnoty předchozího testu.
- Do integračních testů patří jen to, co bez databáze nedává smysl: transakce,
  unikátní indexy a podmínky uvnitř `UPDATE`. Zesměšněná Prisma by u nich
  potvrzovala jen to, že jsme kód napsali tak, jak jsme ho napsali.
  Retence je toho případ: ověřuje se **co po ní zbude**, a hlavně to, co zbýt
  musí (doklady, souhlasy). Nová tabulka patří i do `TABULKY`
  v [data.ts](src/test/data.ts), jinak zbytek po předchozím testu shodí ten další.
- Route handler se testuje s `vi.mock('@/lib/auth')` (respektive `@/lib/admin`) —
  `next/headers` mimo požadavek Next.js neexistuje.

## Known gaps — worth fixing when touching these files

### Still incomplete

The shop runs end to end: catalog → cart → checkout → order → invoice → admin.
What is still missing:

- **`oblibene/`** page renders from the context, which works, but was never rewritten to
  use the server data shape returned by [api/oblibene](src/app/api/oblibene/route.ts).
- **Zásilkovna pickup point** is a free-text field. The map widget needs the Packeta API key.

### Other gaps

- **Transactional e-mail really sends** through nodemailer once `SMTP_HOST` and `EMAIL_FROM`
  exist. Without them [odeslat-email.ts](src/worker/jobs/odeslat-email.ts) logs the message
  and reports success — missing config must never make pg-boss retry something that cannot
  pass. A genuine SMTP *failure* does throw, so the queue retries it. The content is logged
  in every branch where the message did not reach the recipient: filling in `SMTP_*` used to
  silence the output entirely, so configuring e-mail made the situation worse than leaving
  it empty. Templates are pure `data → { html, text }` functions in
  [sablony.ts](src/worker/emaily/sablony.ts), testable without SMTP — and the one place
  **inline hex is correct**, because mail clients drop stylesheets and class names have
  nothing to bind to. Adding a `TypEmailu` means adding a `case` there; an unknown type is
  logged, never sent as an empty message.
- Rate limiting ([rate-limit.ts](src/lib/rate-limit.ts)) counts in process memory — fine for
  the single-container deployment, but it resets on restart and would not be shared if the
  app ever scaled to several `web` instances. Each entry carries `platiDo`; the sweeper
  keys off that, **never off a fixed age** — a fixed 10-minute sweep silently turned the
  hour-long windows (newsletter, contact form) into ten-minute ones. Covered by
  [rate-limit.test.ts](src/lib/rate-limit.test.ts).
- The limiter keys off `X-Forwarded-For`, which the sender controls. It is only trustworthy
  because `docker-compose.yml` publishes `web` on `127.0.0.1` — reachable through Caddy, not
  from outside. Overriding `WEB_BIND=0.0.0.0` re-opens brute-force on login.
- The Docker build uses `npm install`, not `npm ci`: `package-lock.json` is generated on
  Windows and omits the Linux platform binaries (`@img/sharp-linuxmusl-x64` and friends),
  so `npm ci` fails inside the image. Fully reproducible builds would need the lock file
  generated on Linux.
- **Captcha (Turnstile) turns on with the keys, on both sides at once.**
  [captcha.ts](src/lib/captcha.ts) passes verification through when
  `TURNSTILE_SECRET_KEY` is missing, and [Captcha.tsx](src/components/ui/Captcha.tsx)
  renders nothing without `TURNSTILE_SITE_KEY`. Both halves must stay coupled: server-side
  checking without a widget would reject every submission the moment `.env` is filled in.
  A Cloudflare outage is also let through on purpose — a closed contact form costs more
  than the spam, and the per-IP limiter still applies. Wired into `/api/kontakt`; other
  public forms take the same two lines (`captcha` in the schema, `overitCaptchu` after
  `parse`, `<Captcha>` before the submit button).
- **Payments (GoPay) are wired end to end** and switch on with `GOPAY_*` in `.env` — the
  `zpusobPlatby` enum checks `jeNastaveno()` at request time rather than listing values, so
  no code changes when the keys land. Three rules worth keeping:
  **(1) paid status never comes from the browser** — the notification and the return URL
  carry only a payment `id`, so [platba.ts](src/lib/platba.ts) asks the gateway
  server-to-server; **(2) the amount is compared** against what was left to pay after the
  gift card, and a mismatch is logged and left for manual handling rather than marked paid;
  **(3) the state check sits inside the `UPDATE`** (`updateMany` on
  `{ id, stavPlatby: { not: 'ZAPLACENO' } }`) — the gateway repeats notifications and the
  customer reloads the return page, and two passes would each queue gift-card generation,
  handing out codes twice. `Order.platbaId` is `@unique` so one payment can never settle two
  orders. The notification endpoint answers 200 even for unknown ids (the gateway would
  otherwise retry forever) and must **not** call `jeStejnyPuvod` — it has no browser origin.
  A gateway outage during checkout does not cancel the order: `platebniUrl` comes back null
  and the customer pays by transfer from the confirmation page.

Closed: the § 1830a withdrawal button did not exist and the shop was already two months
past its effective date, so a guest order had no way to withdraw at all · the model
withdrawal form promised by the confirmation page and by the invoice was nowhere on the
site (nařízení vlády 363/2013 Sb.) · the order button said „Objednat závazně", which says
that it binds but not to what (§ 1826 odst. 3) · `Reklamace.lhutaDo` was stored and
backfilled but never computed for new rows and nothing warned before the 30-day deadline ·
complaints required a login, which a guest order can never have · nothing was ever deleted,
so contact messages, stock watches, audit log and `ipObjednavky` were kept forever (čl. 5
odst. 1 písm. e) · no data-portability export (čl. 20) · the privacy policy had three
paragraphs and invented company details, missing legal bases, retention periods, recipients
and every right except access · the delivery time was nowhere on the site (§ 1820 odst. 1
písm. h) and the product card promised a hardcoded „Doručení do 2 dnů" · terms were a
version label pointing at wording nothing preserved · the invoice printed neither the VAT
breakdown (§ 29 zák. o DPH) nor `zapisVRejstriku` (§ 435 o. z.) · newsletter had no double opt-in, so `potvrzeno` stayed `false` forever and the list
was interest rather than consent — now `/api/newsletter/potvrzeni` completes it, and
**confirming is a POST, never the GET that opens the link**: a mail client's preview robot
prefetches links, and a GET would manufacture the very consent the double opt-in exists to
prove (same reason the unsubscribe link is a POST, just with the opposite damage) · the
abandoned-cart and low-stock jobs marked their rows as notified and only logged, so the
flag was spent without anyone being told — both now queue a real message ·
raw hex literals · `focus:outline-none` · `alert()` for form validation · ESLint
configured · wildcard remote image host narrowed · `/admin` gated by
[middleware.ts](src/middleware.ts) **plus a database role check in every admin endpoint** ·
`/produkty/[kategorie]` existed only in sitemap.xml, now a real route · zero structured
data, now Product/Offer/Breadcrumb/Organization/LocalBusiness · sitemap and product feed
generated from the database instead of invented rows · `/kosik` rendered two hardcoded
products instead of the real cart · confirmation page was readable by anyone who counted
up the order number · stock could go negative under concurrency · newsletter, contact form
and "Upozornit, až bude skladem" had no endpoint and only faked success · admin lists
silently truncated at 100–200 rows with no way to reach the rest (and `/admin/produkty`
had no limit at all) · hour-long rate-limit windows were swept away after ten minutes ·
double-clicking cancel reversed stock and gift-card balance twice · malformed JSON bodies
returned 500 · guest orders got no status e-mail because only `user.email` was read ·
contact details
on `/kontakt` were hardcoded instead of read from `Settings` · the `jePlatceDph` switch
reached the invoice but never the shop · cookie banner pre-ticked the
optional categories (GDPR breach) and the consent controlled nothing, now
[souhlas-cookies.ts](src/lib/souhlas-cookies.ts) gates GA4 and Meta Pixel ·
`/zapomenute-heslo` 404'd, now a full reset flow with hashed one-time tokens · money was
computed in floats, now [penize.ts](src/lib/penize.ts) works in integer haléře · cart was
localStorage-only, now merges with the account on login and revalidates availability ·
`opengraph-image` missing, now `/public/og-image.png` · no tests at all, now Vitest covers
money, slugs, upload validation, order input, gift-card amounts and the CSRF check, plus
integration tests over the order transaction, storno and reklamace — including the
concurrency races (six simultaneous orders for the last piece, double-clicked
cancel) that used to be verified only by hand · checkout created no
order at all, now writes `Order`/`OrderItem` in one transaction with stock decrement,
discount-code and gift-card handling · search was a single `contains` over the raw
columns, so it needed the exact substring **with** diacritics ("saty" found nothing);
now keyword search over normalized columns with a live suggestion dropdown
([VyhledavaciPole.tsx](src/components/shop/VyhledavaciPole.tsx),
[api/vyhledavani](src/app/api/vyhledavani/route.ts)) · `/produkty/[kategorie]` never
read `hledat`, so search inside a category returned the whole category and page two
of any category search dropped the filter.

## Legal compliance — the rules that carry fines

Czech/EU e-commerce law reaches into the schema, not just the copy. Everything here
is enforced in code because a wrong value looks like nothing at all — no broken
layout, no failing test, just a number on the page that is not lawful.

### Price history is mandatory, and the reference price is **frozen**

§ 12a zák. č. 634/1992 Sb.: whenever a discount is announced, the page must show the
lowest price at which the goods were sold **in the 30 days before the discount
started**, and the seller must be able to prove it (ČOI fine up to 5 000 000 Kč).

- Every price write records a row in `PriceHistory` — rows are **never updated or
  deleted**, it is evidence. `Product.cena` alone cannot prove anything: overwriting
  the column destroys the previous value.
- `Product.nejnizsiCena30DniHaleru` is **frozen when the discount starts**, not a
  sliding window. A sliding window would pull the sale price itself into the window
  after a few days, the reference would sink onto it, and the shop would advertise a
  discount off its own discount — exactly the trick the amendment bans.
- A discount that **deepens without interruption** keeps the original reference
  (§ 12a odst. 3). Otherwise the duty is dodged by stepping 3490 → 2990 → 2490.
- Reference price is computed in [cenova-historie.ts](src/lib/cenova-historie.ts)
  **before** the new history row is written. Reversing that order poisons the window.
- The lowest price in the window includes the price **in effect when the window
  opened** — not just rows dated inside it. A product whose price last changed six
  months ago has no rows in the window but was on sale at that price the whole time.
- Percentages come from `procentoSlevyZReferencni`, never `(cena - cenaPoSleve) / cena`.
  **No reference price → no percentage badge at all.** An undocumentable number is
  worse than none.
- The reference sentence belongs on **every** announcement of a discount — the catalog
  card as well as the detail page, which is why `ProduktVypis` carries it.
- `popisNejnizsiCeny` / `procentoSlevyZReferencni` live in [penize.ts](src/lib/penize.ts),
  not in `cenova-historie.ts`: client components need them, and `cenova-historie.ts`
  imports Prisma. Same Edge/Node split reasoning as `session.ts` vs `auth.ts`.
- **`PriceHistory` is `onDelete: Restrict`, never `Cascade`.** It shipped as Cascade for
  one afternoon and that was a real defect: `db.product.delete()` silently destroyed the
  product's price evidence — no error, no warning, nothing in the audit log. Cascade is
  the right default for photos and variants; on an evidentiary table it is a way to lose
  the evidence by accident. The DB now refuses, so the DELETE endpoint has to decide out
  loud: a product **ever offered at a discount** cannot be deleted at all (archive it by
  unticking `aktivni`), and one that never was deletes its history in an explicit
  `$transaction`. Covered by
  [route.integration.test.ts](src/app/api/admin/produkty/route.integration.test.ts).
- Vyhláška 450/2009 Sb. wants the **start and end** of each price period. The schema stores
  only `platnaOd` and derives the end from the next row — deliberately: a stored `valid_to`
  needs an UPDATE before every INSERT, and a crash between the two leaves a window with no
  valid price at all. One append-only INSERT cannot produce that gap.

### Product data required before a product may be offered

- **GPSR**, nařízení (EU) 2023/988: manufacturer name, postal address and e-mail are
  **required** by `produktSchema` — not just by the form, because a hand-built request
  would otherwise create a product that is unlawful from the first second. An EU
  responsible person (čl. 16) is required only for a non-EU manufacturer, and must be
  filled in **completely or not at all** — a name without an address satisfies nothing
  and reads on the page like a real record.
- **Textile**, nařízení (EU) 1007/2011: `slozeniMaterialu` holds the fibre composition
  in percentages ("55 % len, 45 % bavlna"). It is deliberately separate from
  `material`, which is free marketing prose ("jemný praný len") and does **not**
  satisfy the regulation.
- `obsahujeZivocisneCasti` renders the sentence „Obsahuje netextilní části živočišného
  původu" required by **čl. 12** of the same regulation — leather trims, fur collars, horn
  or mother-of-pearl buttons. Fibre composition does **not** discharge this duty: it
  describes only the textile part, so a leather belt on a wool coat never appears in it.
  It is a checkbox, not free text, because the regulation prescribes the wording.
- Gift cards are exempt from all of the above — a voucher is not a product with a
  manufacturer. Same exemption as `material` and `udrzba`.

### Consent must be provable by the controller, not the browser

Čl. 7 odst. 1 GDPR: the controller must be able to **demonstrate** consent. Cookie
consent used to live only in `localStorage` — held by the customer, not the shop, and
deleted with her browser history. That is not evidence.

- `SouhlasZaznam` rows are **incremental and immutable**. Withdrawal is a new row with
  `udeleno = false`, never an overwrite — čl. 7 odst. 3 says withdrawal does not affect
  the lawfulness of processing before it, so the controller must still be able to show
  the consent once held.
- The cookie subject id is `crypto.randomUUID()` and deliberately **not** derived from
  IP or a browser fingerprint: such a key would itself be the tracking that the consent
  is supposed to authorize.
- Recording never blocks the user-facing action. `zaznamenatSouhlas` swallows failures
  and `odeslatSouhlasNaServer` is fire-and-forget — an unreachable database must not
  make the cookie bar unclickable, and consent is valid because it was given, not
  because we managed to log it.
- Newsletter double opt-in stores **both** steps (`ipPrihlaseni`, then `potvrzenoAt` +
  `ipPotvrzeni`). The confirming `updateMany` carries `potvrzeno: false` in its
  `where` — without it every page reload would push the consent date to today, and the
  evidence would claim she consented this morning rather than a year ago.
- **Backfilling consent is forbidden.** Old rows keep `potvrzenoAt` / `souhlasPodminkyAt`
  null on purpose. Invented proof is worse than an admitted gap.

### The order is an accounting document

- `souhlasPodminkyAt` **and** `verzePodminek` are stored. The timestamp alone is
  useless once the terms change — proving "she agreed" requires proving to what.
  Bump `Settings.verzePodminek` in admin after every change of wording.
- `jePlatceDph`, `sazbaDph` and `dphHaleru` are a **snapshot**, not a lookup. Reading
  today's `Settings.jePlatceDph` would retroactively rewrite last year's invoices.
- Prices in the shop include VAT, so `dphZCelkem` computes tax **from the top**:
  `celkem − celkem / (1 + sazba/100)`. `celkem × sazba` overstates 21 % VAT by a fifth.
- `ipObjednavky` is proof of a distance contract (legitimate interest), kept shorter
  than the order itself.
- `datumDoruceni` exists because the 14-day withdrawal period (§ 1829) runs **from
  receipt**, not from ordering — without it the shop cannot tell whether a withdrawal
  is timely.

### Still open — known legal gaps

- If product **reviews** are ever added, the Omnibus amendment requires saying whether each
  one comes from a verified purchase, and bans publishing only the positive ones. There is
  no review feature today, so nothing is in breach — but the model needs an order link
  from day one, because verification cannot be reconstructed afterwards.
- **Public coupons count into the 30-day lowest price.** ČOI has confirmed that a coupon
  displayed *at the product* enters the calculation. Today `DiscountCode` is only ever typed
  in at checkout, so it stays out of `PriceHistory` on purpose — but the moment a code is
  advertised on the product page, it becomes part of the offered price and has to be
  recorded as one.
- **Settings the owner has to fill in, not code.** `adresaProVraceni`, `emailProGdpr`,
  `zapisVRejstriku` and the real company identification are read from `Settings` everywhere
  they appear. Every page degrades honestly while they are empty — the withdrawal
  confirmation promises to send the return address by e-mail instead of inventing one —
  but until they are filled in, the legal texts are incomplete. Same for the `[DOPLNIT]`
  placeholders in [dokumenty/](dokumenty/).
- **Accessibility (zák. č. 424/2023 Sb.) does not apply**: a microenterprise is exempt when
  it has fewer than 10 employees **and** turnover under 2 mil. EUR, and this shop is under
  both. It is not a permanent answer — see [dokumenty/pristupnost.md](dokumenty/pristupnost.md),
  which records the reasoning and what would have to be built if turnover crosses the line.

## Legal work done in 2026-08 — what to not undo

- **`/odstoupeni` is the § 1830a flow** and its shape is prescribed, not stylistic: reachable
  **without logging in** (footer, order confirmation, confirmation e-mail), **two steps**
  (recap, then confirm), and an automatic confirmation carrying **date and time of receipt**.
  The time comes from the server and is fixed once (`prijeti`) so the database row and the
  e-mail cannot disagree. `potvrzeniOdeslanoAt` is set only **after** the job is queued —
  setting it first would mark as confirmed something the customer never received.
- **Odstoupit lze i částečně.** § 1829 nikde neříká, že se odstupuje od celé
  objednávky, takže formulář nechá vybrat kusy. Vrácení všeho je **jeden** řádek
  s `orderItemId: null`, částečné vrácení jeden řádek na kus — rozepsat celou
  objednávku na položky by v administraci vypadalo jako tři samostatné žádosti.
  Kontrola duplicit je proto **po položkách**: jediná otevřená žádost dřív blokovala
  jakékoli další odstoupení, což zákaznici, která minulý týden vrátila jedny šaty
  a teď chce vrátit druhé, upíralo právo, na které jí lhůta pořád běží.
- **`datumDoruceni` plní přechod objednávky do `DORUCENA`**, `datumExpedice` přechod
  do `EXPEDOVANA` — a jen tehdy, když je sloupec ještě prázdný. Přepsat datum při
  druhém uložení téhož stavu by lhůtu pro odstoupení posunulo dopředu a odstoupení
  podané poslední den by se počítalo od nového data. Do téhle chvíle do obou sloupců
  **nikdo nikdy nezapsal**, takže čtrnáctidenní lhůta fakticky nikdy nezačala běžet.
- **Evropská platforma ODR se v podmínkách neuvádí.** Nařízení (EU) 524/2013 bylo
  zrušeno a platforma 20. 7. 2025 skončila; odkaz by posílal zákaznici na
  neexistující službu. Mimosoudní řešení sporů obstarává ČOI, ta funguje dál.
- **Two public keys, never the order number alone.** `verejnyToken`, or order number **plus**
  e-mail. Numbers run in sequence, so the number by itself would let anyone page through
  other people's purchases. `najitObjednavkuKlicem` in [odstoupeni.ts](src/lib/odstoupeni.ts)
  is shared by withdrawal and complaints on purpose — two copies of an authorization check
  drift, and here the drift means opening someone else's order.
- **Guests can file complaints too** (`/reklamace`, and `/api/reklamace` without a session).
  Rights from defective performance do not depend on having an account. When a session
  *does* exist it wins: `orderId` is checked against `userId` and the public key is ignored,
  otherwise a logged-in customer could pass a foreign token and bypass her own check.
- **Legal deadlines live in [lhuty.ts](src/lib/lhuty.ts)**, nowhere else. `lzeOdstoupit(null)`
  returns **true** — a not-yet-delivered order can still be withdrawn from (§ 1829 odst. 1),
  the clock simply has not started. `Reklamace.lhutaDo` is computed at creation in **both**
  paths (customer form and admin), because most complaints are entered by the owner and a
  deadline watch that skips those watches nothing.
- **Terms are stored text, not a label.** [PravniDokument](prisma/schema.prisma) is
  **append-only** like `PriceHistory`: a new wording is a new version, never an edit. The
  admin endpoint has no PUT and no DELETE, and that is the feature. `Order.verzePodminek`
  is resolved from the effective stored version (`verzeProObjednavku`), not from the
  hand-maintained `Settings.verzePodminek` label — that label was the weak point, because
  forgetting to bump it silently pointed orders at wording the customer never saw. It
  survives only as the fallback for an empty table.
  `/obchodni-podminky?verze=…` renders the historical wording; that link is the whole point.
- **Retention runs nightly** ([retence.ts](src/lib/retence.ts), 3:20). The periods are in
  code with the reason for each, not in `.env` — they are legal decisions. What it must
  **never** touch: orders and invoices (accounting law outranks storage limitation), and
  consent records for newsletter and terms (čl. 7 odst. 1 needs them provable). Only
  `COOKIES` consents age out. Covered by
  [retence.integration.test.ts](src/lib/retence.integration.test.ts), including the
  "what must remain" half.
- **`/api/ucet/export`** answers čl. 20 in JSON — machine-readable is the requirement, so a
  PDF would not do. It deliberately omits the password hash and cookie-consent rows: the
  cookie subject id is random precisely so it cannot be tied to a person, and joining it to
  an account for the export would manufacture that link.
- **The confirmation e-mail carries the withdrawal instruction itself, not a link to it.**
  § 1822 odst. 1 wants confirmation of the contract *in text form on a durable medium*, and a
  web page is not one — it can be rewritten, so a year later it proves nothing about what she
  was told. The e-mail in her inbox is durable, so the full instruction lives in its body:
  deadline, how to withdraw, refund terms, and **who pays return postage**. That last sentence
  is not politeness — under § 1820 odst. 1 písm. i) the seller bears those costs if the buyer
  was not told, so omitting it costs money. The same sentence therefore also sits by the order
  button. `Order.verzePodminek` goes into the e-mail as a `?verze=` link, so she keeps a
  pointer to the exact wording she agreed to. Covered by
  [sablony.test.ts](src/worker/emaily/sablony.test.ts).
- **`/admin/doklady` is how an inspection gets answered.** ČOI and ÚOOÚ send a letter
  with one question and a deadline; the answer is a **printout about that one thing**,
  never a database dump — a dump would hand over every other customer's data and breach
  minimisation while answering a question about one person. The page prints the price
  evidence for one product (§ 12a, with a `kDatu` so a *past* window can be proven, which
  is what they actually ask about) and every consent held for one e-mail (čl. 7 odst. 1).
  Both endpoints are **read-only on purpose**: evidence you can edit proves nothing.
  Cookie consents are keyed by a random id and are deliberately **not** joined to the
  e-mail — that join would manufacture the very link the random id avoids.
- **The invoice prints the VAT breakdown** from the order snapshot (`sazbaDph`, `dphHaleru`),
  never from today's settings, and only for a VAT payer. A non-payer must not show VAT at all.

## Orders — rules that are easy to break

- **Prices come from the database, never from the request.** [objednavka.ts](src/lib/objednavka.ts)
  re-reads every variant; the browser only sends `variantId` and `mnozstvi`.
- The whole write is **one transaction**: order, stock decrement, discount-code counter and
  gift-card balance move together, or not at all.
- Cancelling (customer or admin) **reverses all three** — stock back up, code counter down,
  gift-card balance restored and reactivated. Same for an approved return, which also flips
  the order to `VRACENA`.
- **The cancel also puts its state check inside the UPDATE** (`updateMany` on
  `{ id, stav }`, then assert `count === 1`). A double-click otherwise ran the reversal
  twice: stock came back doubled and the gift-card balance was credited twice — the
  cancel hands out money, so this is the expensive direction of the same race.
- Gift cards bought as goods are issued **only once payment is marked `ZAPLACENO`**, and one
  code per piece ([vygenerovat-poukazy.ts](src/worker/jobs/vygenerovat-poukazy.ts)).
  `castkaZVarianty` deliberately requires the whole variant name to be an amount — matching
  "the first number in the string" would mint a 38 Kč card from the clothing size "M (38)".
- Order numbers (`2026-00001`) are derived from a per-year count; the unique index is the
  real guard against a collision under concurrency, and `vytvoritObjednavku` retries the
  whole transaction (up to 5×, each with a higher offset) when it hits one. Without the
  retry the second customer got "Tato hodnota už je obsazená." and lost the order.
- **Stock is decremented with the check inside the UPDATE** —
  `updateMany({ where: { id, skladem: { gte: n } } })`, then assert `count === 1`. The
  friendly "zbývá jen N ks" check earlier in the transaction is for the message only; there
  is a gap between it and the write that a concurrent order fits into. Verified: six
  simultaneous orders for the last piece → one 201, five 409, stock lands on 0.
- **Links that must work without a login use `Order.verejnyToken`**, never the order number.
  Numbers are sequential, so `?cislo=2026-00002` let anyone page through other people's
  name, address and purchase. This covers the confirmation page and `/api/faktura/[token]`,
  which serves the PDF out of `storage/faktury/` (`Cache-Control: private, no-store`).
- `Order.email` holds the contact address. Guest checkout has no `User`, so before this
  column the invoice for every unregistered order carried no e-mail at all.
- PDF invoices embed **DejaVu Sans** from `assets/fonts/`. The PDF standard fonts have no
  Czech diacritics — without the embedded font the invoice shows `?` instead of ř/š/ž.
