import React from 'react';

export type CategoryGlyphName =
  | 'vse'
  | 'saty'
  | 'halenky'
  | 'svetry'
  | 'saka'
  | 'poukazy';

interface CategoryGlyphProps {
  name: CategoryGlyphName;
  className?: string;
}

/**
 * Plastické siluety kousků pro dlaždice a kruhy kategorií.
 *
 * Jde o vektorové ilustrace, ne o fotorealistické 3D rendery – dojem hloubky
 * dělá dvojice přechodů (světlo zleva, stín vpravo) plus měkký stín pod
 * objektem. Vystačí si s brandovými odstíny a váží pár set bajtů, takže
 * nahrazují prázdné výplně do doby, než budou nafocené skutečné produkty.
 *
 * Každý přechod má vlastní `id` odvozené od `name`, aby se při vykreslení
 * několika glyfů na stránce navzájem nepřepisovaly.
 */
export const CategoryGlyph: React.FC<CategoryGlyphProps> = ({ name, className = '' }) => {
  const svetlo = `${name}-svetlo`;
  const latka = `${name}-latka`;
  const stin = `${name}-stin`;

  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        {/* Hlavní objem: světlo vlevo nahoře, stín vpravo dole */}
        <linearGradient id={latka} x1="0.15" y1="0.05" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#FFFDFA" />
          <stop offset="45%" stopColor="#EFE6D9" />
          <stop offset="100%" stopColor="#CBB89F" />
        </linearGradient>
        {/* Doplňkový, tmavší materiál (rukávy, klopy, stuha) */}
        <linearGradient id={svetlo} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#E7DBC9" />
          <stop offset="100%" stopColor="#B49B7C" />
        </linearGradient>
        {/* Měkký kontaktní stín pod objektem */}
        <radialGradient id={stin} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#2B2019" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2B2019" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="48" cy="83" rx="26" ry="5.5" fill={`url(#${stin})`} />

      {name === 'saty' && (
        <>
          {/* Šaty: úzký živůtek, sukně do zvonu */}
          <path
            d="M38 20 L48 26 L58 20 L64 26 L54 36 L54 44 L70 78 Q48 84 26 78 L42 44 L42 36 L32 26 Z"
            fill={`url(#${latka})`}
          />
          <path d="M42 44 L54 44 L70 78 Q59 81 48 81 L48 44 Z" fill={`url(#${svetlo})`} opacity="0.5" />
          <path d="M38 20 L48 26 L58 20 L54 36 L42 36 Z" fill={`url(#${svetlo})`} opacity="0.65" />
        </>
      )}

      {name === 'halenky' && (
        <>
          {/* Halenka: límeček a nabírané rukávy */}
          <path
            d="M36 22 L48 28 L60 22 L74 32 L68 46 L62 42 L62 74 Q48 78 34 74 L34 42 L28 46 L22 32 Z"
            fill={`url(#${latka})`}
          />
          <path d="M60 22 L74 32 L68 46 L62 42 L62 74 Q55 76 48 76 L48 28 Z" fill={`url(#${svetlo})`} opacity="0.45" />
          <path d="M36 22 L48 28 L60 22 L52 34 L44 34 Z" fill={`url(#${svetlo})`} opacity="0.8" />
        </>
      )}

      {name === 'svetry' && (
        <>
          {/* Svetr: rolák a spuštěné rukávy */}
          <path d="M40 18 Q48 14 56 18 L56 26 Q48 23 40 26 Z" fill={`url(#${svetlo})`} />
          <path
            d="M40 25 L56 25 L72 34 L68 56 L62 53 L62 76 Q48 80 34 76 L34 53 L28 56 L24 34 Z"
            fill={`url(#${latka})`}
          />
          <path d="M56 25 L72 34 L68 56 L62 53 L62 76 Q55 78 48 78 L48 25 Z" fill={`url(#${svetlo})`} opacity="0.42" />
        </>
      )}

      {name === 'saka' && (
        <>
          {/* Sako: široké klopy a náznak knoflíků */}
          <path
            d="M34 20 L48 27 L62 20 L76 30 L70 50 L66 47 L66 78 Q48 82 30 78 L30 47 L26 50 L20 30 Z"
            fill={`url(#${latka})`}
          />
          <path d="M62 20 L76 30 L70 50 L66 47 L66 78 Q57 80 48 80 L48 27 Z" fill={`url(#${svetlo})`} opacity="0.4" />
          <path d="M34 20 L48 27 L44 52 L38 30 Z" fill={`url(#${svetlo})`} opacity="0.75" />
          <path d="M62 20 L48 27 L52 52 L58 30 Z" fill={`url(#${svetlo})`} opacity="0.6" />
          <circle cx="48" cy="58" r="1.8" fill="#7A4B32" opacity="0.55" />
          <circle cx="48" cy="66" r="1.8" fill="#7A4B32" opacity="0.55" />
        </>
      )}

      {name === 'poukazy' && (
        <>
          {/* Dárková karta se stuhou, mírně natočená */}
          <rect x="18" y="34" width="60" height="40" rx="5" fill={`url(#${latka})`} />
          <rect x="48" y="34" width="30" height="40" rx="5" fill={`url(#${svetlo})`} opacity="0.45" />
          <rect x="44" y="34" width="8" height="40" fill={`url(#${svetlo})`} opacity="0.85" />
          <rect x="18" y="50" width="60" height="8" fill={`url(#${svetlo})`} opacity="0.85" />
          <path d="M48 34 Q40 24 34 30 Q40 36 48 34 Z" fill={`url(#${svetlo})`} />
          <path d="M48 34 Q56 24 62 30 Q56 36 48 34 Z" fill={`url(#${svetlo})`} />
        </>
      )}

      {name === 'vse' && (
        <>
          {/* Tři vrstvené kousky na ramínku – zástupce celé nabídky */}
          <path d="M26 30 L36 26 L46 30 L44 74 Q35 77 28 74 Z" fill={`url(#${svetlo})`} opacity="0.55" />
          <path d="M38 26 L48 22 L58 26 L56 76 Q47 79 40 76 Z" fill={`url(#${latka})`} />
          <path d="M50 30 L60 26 L70 30 L68 74 Q59 77 52 74 Z" fill={`url(#${svetlo})`} opacity="0.75" />
          <path d="M48 22 L58 26 L56 76 Q52 77 48 77 Z" fill={`url(#${svetlo})`} opacity="0.35" />
        </>
      )}
    </svg>
  );
};
