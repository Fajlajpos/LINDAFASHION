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
- Route handler se testuje s `vi.mock('@/lib/auth')` (respektive `@/lib/admin`) —
  `next/headers` mimo požadavek Next.js neexistuje.

## Known gaps — worth fixing when touching these files

### Still incomplete

The shop runs end to end: catalog → cart → checkout → order → invoice → admin.
What is still missing:

- **`oblibene/`** page renders from the context, which works, but was never rewritten to
  use the server data shape returned by [api/oblibene](src/app/api/oblibene/route.ts).
- **Saved addresses** in `muj-ucet` — the `Address` model exists and the admin shows them,
  but the customer cannot add or edit one; checkout always asks for the address again.
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

Closed: newsletter had no double opt-in, so `potvrzeno` stayed `false` forever and the list
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
