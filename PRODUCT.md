# UEW CerTiFyHub — Design Context & Guidelines

## Design Context

### Users
- **Super Admins**: Full system access — manage admins, templates, certificates, settings, audit logs. Power users who need efficiency and control.
- **Admins (Faculty/Registry Staff)**: Manage students, issue certificates (single & bulk), view analytics. Daily operational users who value speed and clarity.
- **Students**: View their own certificates and profile. Minimal interaction, needs to be intuitive on first visit.
- **Employers (optional)**: Verify certificate authenticity via public portal. No account required for basic verification.

### Brand Personality
**Academic · Secure · Polished**

The interface should feel like a modern, well-maintained institutional tool — not a startup product, not a legacy portal. It communicates trust through visual precision and consistency, not through ornamentation.

### Aesthetic Direction
- **Visual tone**: Clean, monochrome-forward with strategic color accents. Inspired by Linear/Vercel — sharp typography, minimal chrome, generous whitespace.
- **References**: Linear (navigation clarity), Vercel (typography & spacing), Stripe (data presentation).
- **Anti-references**: Cluttered legacy university portals, generic Bootstrap themes, overly playful/creative interfaces.
- **Theme**: Light mode primary. Dark sidebar with brand purple.
- **Typography**: Poppins (already in use) — clean geometric sans-serif appropriate for academic context.

### Design Principles
1. **Clarity over decoration** — Every element earns its place. No ornamental gradients, shadows, or animations without purpose.
2. **Consistency is trust** — Identical patterns for identical actions. One button style per intent. One color per meaning.
3. **Data-first** — Tables, stats, and certificates are the content. UI chrome should recede; data should be prominent.
4. **Accessible by default** — WCAG 2.1 AA compliance. Proper contrast, keyboard navigation, screen reader support, semantic HTML.
5. **Progressive disclosure** — Show what's needed now. Modals, drawers, and expandable sections for secondary actions.

---

## Design Tokens

### Colors

#### Brand
| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#242576` | Sidebar background, primary brand identity |
| `--color-brand-light` | `#3b3b89` | Sidebar hover/active states, brand accents |
| `--color-brand-dark` | `#1b1c5e` | Sidebar footer, pressed states |

#### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `theme(colors.blue.600)` / `#2563eb` | Primary actions (buttons, links, focus rings) |
| `--color-primary-hover` | `theme(colors.blue.700)` / `#1d4ed8` | Primary button hover |
| `--color-success` | `theme(colors.emerald.600)` / `#059669` | Success states, active badges, export actions |
| `--color-success-hover` | `theme(colors.emerald.700)` / `#047857` | Success button hover |
| `--color-danger` | `theme(colors.red.600)` / `#dc2626` | Destructive actions, error states, revoked badges |
| `--color-danger-hover` | `theme(colors.red.700)` / `#b91c1c` | Danger button hover |
| `--color-warning` | `theme(colors.amber.500)` / `#f59e0b` | Warning badges, pending states |

#### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-page` | `theme(colors.slate.50)` / `#f8fafc` | Page background (behind cards) |
| `--color-bg-card` | `#ffffff` | Card/panel background |
| `--color-bg-subtle` | `theme(colors.slate.50)` / `#f8fafc` | Table header, input background, hover rows |
| `--color-border` | `theme(colors.slate.200)` / `#e2e8f0` | Card borders, dividers, input borders |
| `--color-border-light` | `theme(colors.slate.100)` / `#f1f5f9` | Table row dividers, subtle separators |

#### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-primary` | `theme(colors.slate.900)` / `#0f172a` | Headings, primary content |
| `--color-text-secondary` | `theme(colors.slate.600)` / `#475569` | Body text, descriptions |
| `--color-text-muted` | `theme(colors.slate.500)` / `#64748b` | Metadata, timestamps, helper text |
| `--color-text-placeholder` | `theme(colors.slate.400)` / `#94a3b8` | Input placeholders |

### Typography Scale
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-page-title` | `text-2xl` (24px) | `font-bold` | Page headings (h1) |
| `text-section-title` | `text-lg` (18px) | `font-semibold` | Section headings (h2) |
| `text-card-title` | `text-base` (16px) | `font-semibold` | Card headings (h3) |
| `text-body` | `text-sm` (14px) | `font-normal` | Body text, table cells |
| `text-label` | `text-sm` (14px) | `font-medium` | Form labels, nav items |
| `text-caption` | `text-xs` (12px) | `font-medium` | Badges, metadata, timestamps |
| `text-micro` | `text-xs` (12px) | `font-normal` | Helper text, fine print |

### Spacing
| Context | Value |
|---------|-------|
| Card padding | `p-6` (24px) |
| Card gap (grid) | `gap-6` (24px) |
| Section margin | `mb-6` (24px) |
| Input height | `h-10` (40px) |
| Button height | `h-10` (40px) |
| Inline item gap | `gap-3` (12px) |
| List item gap | `gap-4` (16px) |

### Border Radius
| Context | Value |
|---------|-------|
| Buttons | `rounded-lg` (8px) |
| Inputs | `rounded-lg` (8px) |
| Cards | `rounded-xl` (12px) |
| Modals | `rounded-2xl` (16px) |
| Badges/pills | `rounded-full` |
| Avatars | `rounded-full` |

### Shadows
| Context | Value |
|---------|-------|
| Cards | `shadow-sm` |
| Dropdowns/popovers | `shadow-md` |
| Modals | `shadow-xl` |
| Hover uplift | `shadow-md` |

### Gray Scale
**Use `slate-*` exclusively.** Do not mix `gray-*` and `slate-*`.

---

## Component Patterns

### Buttons
- **Primary**: `bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 rounded-lg text-sm font-medium`
- **Secondary**: `bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-10 px-4 rounded-lg text-sm font-medium`
- **Danger**: `bg-red-600 hover:bg-red-700 text-white h-10 px-4 rounded-lg text-sm font-medium`
- **Ghost**: `hover:bg-slate-100 text-slate-600 h-10 px-4 rounded-lg text-sm font-medium`
- **Icon-only**: Must include `aria-label`. Same height/width as text buttons (`h-10 w-10`).

### Form Inputs
- Height: `h-10`
- Border: `border border-slate-200`
- Focus: `focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`
- Background: `bg-white` (default), `bg-slate-50` (disabled)
- Every input must have an associated `<label>` with matching `htmlFor`/`id`.

### Cards
- `rounded-xl border border-slate-200 bg-white shadow-sm`
- Padding: `p-6`

### Tables
- Header: `bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider`
- Rows: `divide-y divide-slate-100 hover:bg-slate-50/50`
- Cells: `text-sm text-slate-700`
- Must include `<caption className="sr-only">` and `<th scope="col">`

### Modals
- Overlay: `fixed inset-0 bg-black/50 z-50`
- Container: `rounded-2xl bg-white shadow-xl max-w-lg mx-auto`
- Must include: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape to close

### Loading States
- **Page-level**: Skeleton loaders (animated `bg-slate-200` blocks)
- **Button/inline**: `Loader2` spinner from lucide-react with `animate-spin`
- **Must include**: `role="status"`, `aria-label="Loading"`

### Empty States
- Centered layout with: muted icon (48px), heading, description, optional action button
- Use shared `<EmptyState>` component

### Toast Notifications
- Always use `useToast()` hook from `ToastContainer.jsx`
- Never import `react-hot-toast` directly in pages

---

## Accessibility Requirements (WCAG 2.1 AA)

- **Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus indicators**: Visible focus rings on all interactive elements
- **Keyboard navigation**: All functionality accessible via keyboard
- **Screen readers**: Proper ARIA labels, roles, live regions
- **Semantic HTML**: Correct heading hierarchy (h1 → h2 → h3), landmark regions
- **Skip link**: First focusable element in Layout
- **Page titles**: Dynamic `document.title` per page
- **Reduced motion**: Respect `prefers-reduced-motion` for animations

---

## Prohibited Patterns

- ❌ Hardcoded hex colors outside of `--color-brand*` tokens
- ❌ Mixed `gray-*` and `slate-*` classes
- ❌ `text-[Npx]` arbitrary sizes — use Tailwind scale
- ❌ Icon-only buttons without `aria-label`
- ❌ Modals without focus trapping
- ❌ Inputs without associated labels
- ❌ Direct `react-hot-toast` imports in pages
- ❌ `console.log` in production code
- ❌ Public registration for Admin or Student roles
