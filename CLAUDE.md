# CLAUDE.md

Project rules for LINDA FASHION. Global UI/UX rules and the `ui-ux-pro-max` skill live in
`~/.claude/CLAUDE.md` and `~/.claude/skills/ui-ux-pro-max/` — they apply here automatically.
This file only records what is **specific to this project** and overrides the global rules.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma/Postgres e-shop, Czech UI.
[src/app/](src/app/) routes · [src/components/](src/components/) (`shop/`, `ui/`) ·
[src/lib/](src/lib/) · [src/worker/](src/worker/) (pg-boss) · [prisma/](prisma/).

When querying the skill, always pass `--stack nextjs`.

## Design system — existing tokens win

The brand is already defined. The skill **advises**; it does not redecide the brand.
Do not swap the palette or fonts for something the skill suggests — use its output for
layout, UX, accessibility and to fill genuine gaps, then add the gap as a token.

- **Colors:** `linda.*` in [tailwind.config.ts](tailwind.config.ts) — `cream`, `sand`,
  `sandLight`, `espresso`, `espressoLight`, `cognac`, `cognacHover`, `sage`, `sageLight`,
  `sageHover`, `chocolate`. Use `bg-linda-cognac`, `text-linda-espresso`, … —
  **never raw hex in components.**
- **Typography:** `font-serif` = Cormorant Garamond, `font-sans` = Plus Jakarta Sans, loaded
  through `next/font/google` in [src/app/layout.tsx](src/app/layout.tsx). Do not add font
  families and do not reintroduce `@import` font loading in CSS.
- **Shadows:** `shadow-card` / `shadow-elevated`. **Animations:** `animate-fadeIn`,
  `animate-fadeInUp` (200–250ms). **Touch targets:** `min-h-touch` / `min-w-touch` (44px).
- **Focus:** a global `:focus-visible` ring is defined in
  [src/styles/globals.css](src/styles/globals.css) using `box-shadow`, so it survives
  `focus:outline-none`. Never remove it; do not add per-component focus rings that fight it.
- **Reduced motion:** globally handled in `globals.css`. New animations need no extra guard.

## Conventions

- Server Components by default; `'use client'` only where interactivity requires it.
- `next/image` for all images, never `<img>`. Lucide for icons, never emoji.
- Czech copy throughout, including `aria-label`s.
- Czech number formatting: `.toLocaleString('cs-CZ')`.

## Known gaps — worth fixing when touching these files

- **~1000 raw hex literals** remain across ~30 files under [src/app/](src/app/) (worst:
  `pokladna`, `admin/produkty/novy`, [Footer.tsx](src/components/shop/Footer.tsx),
  `produkt/[slug]`). Convert to `linda-*` tokens opportunistically.
- **`focus:outline-none`** is still written on ~25 form inputs. The global ring covers them,
  but the utility is misleading — drop it when editing those files.
- **[src/app/(shop)/layout.tsx](<src/app/(shop)/layout.tsx>)** renders `<Header />` with no
  `user` / `vacationMode` props, so the account name and vacation banner never appear.
- **ESLint is not configured** — `npm run lint` opens an interactive setup prompt.
- **[next.config.js](next.config.js)** allows remote images from `hostname: '**'`; the skill
  flags wildcard image domains as High severity. Narrow it to the real CDN host.
- No `opengraph-image` asset — social previews have no image.
