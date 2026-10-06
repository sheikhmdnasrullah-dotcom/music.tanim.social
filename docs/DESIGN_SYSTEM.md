# Design System

Single light theme, semantic tokens, a small set of normalized components.
Defined in `src/app/globals.css` (Tailwind 4 `@theme inline`), consumed by
pages in `src/app/` and shared components in `src/components/`.

## Tokens

Semantic tokens declared in `:root` and registered as Tailwind color/font
utilities in `@theme inline`:

| Token | Value | Utility |
| --- | --- | --- |
| `--background` | `#ffffff` | `bg-background` |
| `--foreground` | `#0a0a0a` | `text-foreground`, `bg-foreground` |
| `--muted` | `#f5f5f5` | `bg-muted` |
| `--muted-foreground` | `#737373` | `text-muted-foreground` |
| `--border` | `#e5e5e5` | `border-border` |
| `--accent` | `#d97706` (amber 600) | `bg-accent`, `text-accent`, `ring-accent` |
| `--accent-light` | `#fef3c7` | `bg-accent-light` |
| `--success` | `#16a34a` | `bg-success`, `border-success` |
| `--danger` | `#dc2626` | `bg-danger`, `border-danger` |
| `--warning` | `var(--accent)` | `bg-warning` |
| `--font-sans` | Geist Sans | `font-sans` (body default) |
| `--font-mono` | Geist Mono | `font-mono` (numbers, timing, Hz/¢ readouts) |
| `--font-display` | Instrument Serif | `font-display` (page titles, lyric display) |

Rules:

- Pages and new components use semantic tokens only. No raw hex classes.
- `slate-XXX` utility classes exist in the older music components
  (`src/components/music/`); they are being normalized to tokens as files
  are touched. Do not add new raw palette classes.
- `primary` maps to `foreground` (black on white) — the app is
  monochrome + amber accent. Reserve `danger` for errors/mic,
  `success` for correct/complete.

## Components

| Component | File | Variants / sizes |
| --- | --- | --- |
| `Button` | `src/components/ui/button.tsx` | `primary` (default), `default`, `secondary`, `outline`, `ghost`, `danger` · `sm` / `md` (default) / `lg` |
| `Badge` | `src/components/ui/badge.tsx` | `default`, `success`, `accent` |
| `Slider` | `src/components/ui/slider.tsx` | styled range input |
| `AppNav` | `src/components/ui/AppNav.tsx` | top navigation, sticky |
| `cn()` | `src/lib/utils.ts` | `clsx` + `tailwind-merge` |

Icons come from `lucide-react` (transport, nav). Emoji are used sparingly
for practice-room affordances (🎤  🔁).

## Layout conventions

- Content pages: `max-w-2xl mx-auto px-4 pt-12 pb-24` single column
  (practice, song, guitar trainers). The home player page is `max-w-6xl`.
- Page header: small uppercase `text-muted-foreground` kicker +
  `font-display` title.
- Section separation: `border-t border-border` + `pt-4/6`; cards are
  `rounded-lg border border-border p-4`.
- Interactive drill cards highlight with `border-foreground` or
  `ring-accent` — never with a new color.

## Accessibility conventions

- Drill targets are real `<button>` elements with `aria-label` where the
  label is icon-only.
- Karaoke state updates use `aria-live="polite"` (syllable pills, stage).
- Focus rings: `focus-visible:ring-2 focus-visible:ring-accent`.
