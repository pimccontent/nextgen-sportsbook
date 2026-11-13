# Design System Spec — NextGen Sportsbook

## Principles
- Mobile-first, touch-friendly odds targets (≥44px height).
- Backend remains authoritative for acceptance, balances, and settlement.
- Original brand — no competitor colours, logos, or assets.
- Loading / empty / error / success / disabled states required.

## Typography
- Display: Sora
- Body: Manrope
- Numeric: IBM Plex Mono (tabular)

## Customer palette
| Token | Value | Use |
|---|---|---|
| bg | `#0B1220` | Page |
| surface | `#121A2B` | Panels |
| elevated | `#182338` | Odds / rows |
| border | `#243049` | Dividers |
| text | `#F3F6FB` | Primary text |
| muted | `#93A0B8` | Meta |
| accent | `#F5A524` | CTA / selected odds (golden orange) |
| live | `#FF4D6A` | Live badge |

## Admin palette
Graphite surfaces (`#0F1012` / `#18181B`) with indigo accent `#6366F1`.

## Agent palette
Neutral navy-graphite with sky accent `#38BDF8`.

## Components (v0)
- `OddsButton`
- `FixtureRow`
- `BetSlipPeekBar`

Tokens live in `packages/design-system`.
