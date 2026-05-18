# CerTiFyHub Design System

## Brand

- **Name:** CerTiFyHub
- **Register:** Product (admin dashboard, certificate issuance, verification)
- **Tone:** Enterprise-grade operational intelligence. Calm authority, not clinical coldness.
- **Scene:** A university registrar or IT admin verifying certificates at a desk under fluorescent office light. The interface must feel trustworthy, responsive, and information-dense without overwhelm.

## Color Strategy: Full Palette

Three named roles carry distinct semantic weight across the surface.

| Role | Hex | OKLCH | Usage |
|---|---|---|---|
| Brand Primary | `#242576` | oklch(32% 0.12 278) | Navigation active state, primary buttons, key headers |
| Brand Accent | `#0ea5e9` | oklch(62% 0.18 234) | Charts, interactive highlights, links |
| Success | `#10b981` | oklch(65% 0.18 160) | Healthy status, verified states, positive trends |
| Warning | `#f59e0b` | oklch(72% 0.17 85)  | Caution badges, pending states, amber alerts |
| Danger | `#ef4444` | oklch(63% 0.22 25)   | Errors, failed status, destructive actions |
| Violet | `#8b5cf6` | oklch(60% 0.22 288) | Admin-specific accents, permission highlights |

**Neutrals:**
- Surface: `#ffffff` (oklch(100% 0 0)) — primary card and page background
- Elevated: `#f8fafc` (oklch(98% 0.005 250)) — subtle section backgrounds, metric card tints
- Border: `#e2e8f0` (oklch(90% 0.01 250)) — card borders, dividers
- Text Primary: `#0f172a` (oklch(20% 0.02 260)) — headings, primary data
- Text Secondary: `#64748b` (oklch(55% 0.03 250)) — labels, descriptions, meta text
- Text Tertiary: `#94a3b8` (oklch(70% 0.02 250)) — timestamps, disabled hints

## Typography

- **Font Family:** Poppins (system-ui fallback)
- **Scale Ratio:** 1.25 (major third)
- **Base:** 14px / 1.5rem line-height
- **Weights:** 400 (body), 500 (labels), 600 (subheadings), 700 (headings, metric values), 800 (hero numbers)

| Token | Size | Weight | Usage |
|---|---|---|---|
| Display | 2.25rem | 800 | Hero metric values |
| H1 | 1.5rem | 700 | Panel titles, page headers |
| H2 | 1.125rem | 600 | Card titles, section headers |
| H3 | 0.875rem | 600 | Subsection labels |
| Body | 0.875rem | 400 | Descriptions, table text |
| Label | 0.6875rem | 600 | Uppercase tracking labels (tracking: 0.12em–0.18em) |
| Caption | 0.75rem | 400 | Timestamps, meta, badges |

## Spacing

- Base unit: 4px
- Card padding: 1.5rem (24px)
- Section gap: 1.5rem (24px)
- Inline element gap: 0.5rem–0.75rem (8–12px)
- Dense list item padding: 0.375rem 0.5rem (6px 8px)

## Components

### Card

- Border: 1px solid `Border`
- Border-radius: `rounded-xl` (12px) for cards and panels per `PRODUCT.md`
- Background: `Surface`
- Shadow: `0 1px 2px 0 rgb(0 0 0 / 0.05)` — extremely subtle, almost flat
- No nested cards. Inner density achieved through dividers and background tints (`Elevated`).

### Status Badge

- Border-radius: 9999px (full)
- Padding: 0.25rem 0.625rem (4px 10px)
- Font: Label token, uppercase
- Border: 1px solid matching tint
- Background: 50-tint of semantic color

### Metric Card (StatusMetricCard)

- Background: semantic 50-tint (e.g., `bg-emerald-50`)
- Border: 1px solid semantic 200-tint
- Border-radius: 0.75rem
- Padding: 0.75rem
- Layout: vertical stack — label, value, status
- Animation: fade-in + translateY(8px→0), 0.35s

### Timeline Row (ExpandableTimelineRow)

- Left rail: vertical line + status-colored dot with ring
- Dot: 10px, ring 3px, hover scale 110%
- Connector line: 1px, 60% opacity, runs between dots
- Content: title (semibold), description (muted), time-ago (right)
- Expand: smooth height animation via Framer Motion, reveals IP/device/timestamp/changes

### Chart (Recharts)

- AreaChart with gradient fills (5%→0% opacity)
- Grid: dashed 3px, `Border` color, vertical false
- Axis: no axis lines, tick font 11px `Text Tertiary`
- Tooltip: white bg, `Border` border, 10px radius, subtle shadow

## Motion

- **Easing:** `ease-out` with exponential feel (Framer Motion default ease-out is sufficient)
- **Panel entrance:** opacity 0→1, y 12→0, 0.4s
- **Row stagger:** 0.03s per item
- **Expand/collapse:** height auto, opacity 0→1, 0.25s
- **No bounce, no elastic, no layout property animation**
- Respect `prefers-reduced-motion` for animations (see `PRODUCT.md` Accessibility)

## Layout Principles

- Information-dense over whitespace-heavy. University admins need to see status at a glance.
- Two-column on XL (`1.6fr / 0.9fr`), single column below.
- Timeline panels replace generic card grids — they carry narrative sequence.
- Every word earns its place. No restated headings.

---

## Cross-Reference

For complete component patterns (buttons, forms, tables, modals, loading states, empty states, toasts), accessibility requirements (WCAG 2.1 AA), and prohibited patterns, see **`PRODUCT.md`**. This document extends `PRODUCT.md` with motion, chart, and timeline-specific specs.
