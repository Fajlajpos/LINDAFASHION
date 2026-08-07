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

### Still mockups — read from hardcoded data, no backend

The admin side (products, categories, photo upload, auth) is wired to the database.
**The shop side is not.** These still render from [home-data.ts](src/lib/home-data.ts)
or from arrays inside the component:

- `(shop)/page.tsx`, `produkty/`, `produkt/[slug]/`, `kosik/`, `pokladna/`, `muj-ucet/`,
  `oblibene/`
- admin `objednavky/`, `zakaznici/`, `slevove-kody/`, `reklamace/`, `nastaveni/`, dashboard
- [api/feed/xml](src/app/api/feed/xml/route.ts) returns two invented products
- Cart lives only in `localStorage` — no DB persistence, no merge on login

### Other gaps

- **[src/app/(shop)/layout.tsx](<src/app/(shop)/layout.tsx>)** renders `<Header />` with no
  `user` / `vacationMode` props, so the account name and vacation banner never appear.
- No `opengraph-image` asset — social previews have no image.
- The newsletter form (hero section, footer) and the contact form still have **no endpoint**;
  they only confirm receipt locally. `TODO` markers sit in the components.
- `/zapomenute-heslo` is linked from the login form but the route does not exist (404).
- Rate limiting ([rate-limit.ts](src/lib/rate-limit.ts)) counts in process memory — fine for
  the single-container deployment, but it resets on restart and would not be shared if the
  app ever scaled to several `web` instances.
- The Docker build uses `npm install`, not `npm ci`: `package-lock.json` is generated on
  Windows and omits the Linux platform binaries (`@img/sharp-linuxmusl-x64` and friends),
  so `npm ci` fails inside the image. Fully reproducible builds would need the lock file
  generated on Linux.

Closed: raw hex literals (only SVG gradients in
[CategoryGlyph.tsx](src/components/shop/home/CategoryGlyph.tsx) and the `themeColor` meta
value remain, both legitimate) · `focus:outline-none` (0 occurrences) · `alert()` for form
validation (replaced by inline errors next to the offending field) · ESLint now configured
in [.eslintrc.json](.eslintrc.json) · wildcard remote image host narrowed in
[next.config.js](next.config.js) · `/admin` was reachable by anyone who knew the URL, now
gated by [middleware.ts](src/middleware.ts) plus a role check in every admin endpoint.
