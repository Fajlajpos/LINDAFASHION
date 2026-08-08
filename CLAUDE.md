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
- API errors use the shape `{ chyba, pole? }` so forms can put the message next to the
  offending field — see [api.ts](src/lib/api.ts).
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

## Known gaps — worth fixing when touching these files

### Still incomplete

The shop runs end to end: catalog → cart → checkout → order → invoice → admin.
What is still missing:

- **`oblibene/`** page renders from the context, which works, but was never rewritten to
  use the server data shape returned by [api/oblibene](src/app/api/oblibene/route.ts).
- **Saved addresses** in `muj-ucet` — the `Address` model exists and the admin shows them,
  but the customer cannot add or edit one; checkout always asks for the address again.
- **Zásilkovna pickup point** is a free-text field. The map widget needs the Packeta API key.
- **Newsletter has no double opt-in.** `POST /api/newsletter` stores the address with
  `potvrzeno = false`; the confirmation e-mail cannot be sent until SMTP exists, so the list
  is a record of interest, not consent to send.

### Other gaps

- Transactional e-mail is queued but never sent — [odeslat-email.ts](src/worker/jobs/odeslat-email.ts)
  logs instead, until SMTP credentials exist. The password-reset link is printed to the
  worker log in development only. **Both branches log the same way on purpose**: filling in
  `SMTP_*` used to silence the output entirely, so configuring e-mail made the situation
  worse than leaving it empty.
- Rate limiting ([rate-limit.ts](src/lib/rate-limit.ts)) counts in process memory — fine for
  the single-container deployment, but it resets on restart and would not be shared if the
  app ever scaled to several `web` instances.
- The Docker build uses `npm install`, not `npm ci`: `package-lock.json` is generated on
  Windows and omits the Linux platform binaries (`@img/sharp-linuxmusl-x64` and friends),
  so `npm ci` fails inside the image. Fully reproducible builds would need the lock file
  generated on Linux.
- Captcha (Turnstile) is not wired to any form yet, only the `.env` keys exist.

Closed: raw hex literals · `focus:outline-none` · `alert()` for form validation · ESLint
configured · wildcard remote image host narrowed · `/admin` gated by
[middleware.ts](src/middleware.ts) **plus a database role check in every admin endpoint** ·
`/produkty/[kategorie]` existed only in sitemap.xml, now a real route · zero structured
data, now Product/Offer/Breadcrumb/Organization/LocalBusiness · sitemap and product feed
generated from the database instead of invented rows · `/kosik` rendered two hardcoded
products instead of the real cart · confirmation page was readable by anyone who counted
up the order number · stock could go negative under concurrency · newsletter, contact form
and "Upozornit, až bude skladem" had no endpoint and only faked success · contact details
on `/kontakt` were hardcoded instead of read from `Settings` · the `jePlatceDph` switch
reached the invoice but never the shop · cookie banner pre-ticked the
optional categories (GDPR breach) and the consent controlled nothing, now
[souhlas-cookies.ts](src/lib/souhlas-cookies.ts) gates GA4 and Meta Pixel ·
`/zapomenute-heslo` 404'd, now a full reset flow with hashed one-time tokens · money was
computed in floats, now [penize.ts](src/lib/penize.ts) works in integer haléře · cart was
localStorage-only, now merges with the account on login and revalidates availability ·
`opengraph-image` missing, now `/public/og-image.png` · no tests at all, now Vitest covers
money, slugs, upload validation, order input and gift-card amounts · checkout created no
order at all, now writes `Order`/`OrderItem` in one transaction with stock decrement,
discount-code and gift-card handling.

## Orders — rules that are easy to break

- **Prices come from the database, never from the request.** [objednavka.ts](src/lib/objednavka.ts)
  re-reads every variant; the browser only sends `variantId` and `mnozstvi`.
- The whole write is **one transaction**: order, stock decrement, discount-code counter and
  gift-card balance move together, or not at all.
- Cancelling (customer or admin) **reverses all three** — stock back up, code counter down,
  gift-card balance restored and reactivated. Same for an approved return, which also flips
  the order to `VRACENA`.
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
