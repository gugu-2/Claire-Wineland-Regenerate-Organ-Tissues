# Feature Spec 11 — Mobile & Tablet Responsive Layouts

**Version:** 1.0  
**Priority:** 🟢 Medium  
**Effort Estimate:** 6 days  
**Status:** Not Started  
**Depends On:** Existing Tailwind CSS setup, all frontend components

---

## 1. User-Facing Description

The application currently runs only on desktop browsers (minimum ~1280px wide). Clinicians using hospital-grade iPads at the bedside, oncologists checking results on their phones between patient rounds, and researchers presenting at conferences need a fully touch-friendly interface that works on:

- **iPad (1024×768, 1366×1024)** — primary clinical use case; bedside tablet review of guide RNA rankings and clinical trial matches
- **Large phone (390×844, 414×896)** — quick result check on iPhone 14 Pro / Android equivalent
- **Smaller tablet (768×1024)** — lab bench Android tablets

The mobile experience does **not** need to be feature-complete — it is a **read + review** experience. Creating new CRISPR designs and uploading scRNA-seq files is desktop-only. The mobile view focuses on **reviewing existing analyses, checking clinical trial matches, and approving collaboration sign-offs**.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    RESPONSIVE BREAKPOINTS (Tailwind)                  │
│                                                                      │
│  sm:  640px+   → Show navigation labels (currently hidden)           │
│  md:  768px+   → Side-by-side panels (e.g. locus + guide table)     │
│  lg: 1024px+   → Full desktop layout (current default)              │
│  xl: 1280px+   → Wide-screen extras (detail panes, 3D viewer)       │
│                                                                      │
│  No changes to existing CSS above md: — zero regression risk         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    COMPONENT CHANGES MAP                              │
│                                                                      │
│  Navbar.jsx            → Hamburger menu below lg:                    │
│  CrisprDesignerView.jsx→ Stacked single-column below md:             │
│  ResearchReportView.jsx→ Horizontal scroll tabs on mobile            │
│  PlaygroundView.jsx    → Simplified controls, 3D viewer hidden <md:  │
│  CollaborationSidebar  → Bottom sheet on mobile                      │
│  WetLabStudioView.jsx  → Accordion panels below md:                  │
│  All modals            → Full-screen below md:                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    NEW MOBILE-SPECIFIC COMPONENTS                     │
│                                                                      │
│  MobileBottomNav.jsx   → 5-tab bottom navigation bar                │
│  MobileSheet.jsx       → Bottom sheet drawer (swipeable)            │
│  MobileResultCard.jsx  → Compact guide RNA result card              │
│  TouchLocus.jsx        → Pinch-zoom locus track                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Package / Version | Purpose |
|-------|-----------|-------------------|---------|
| Responsive CSS | Tailwind CSS | Existing (already installed) | All responsive prefixes |
| Touch gestures | react-swipeable | `react-swipeable>=7.0` | Swipe left/right between tabs |
| Touch gestures 2 | @use-gesture/react | `@use-gesture/react>=10.3` | Pinch-zoom on locus track |
| Bottom sheet | @radix-ui/react-dialog | `@radix-ui/react-dialog>=1.1` (or custom) | Mobile sheet drawer |
| Lazy loading heavy components | React.lazy + Suspense | (React 18 built-in) | Don't load Mol* on mobile |
| Viewport detection | custom hook | `useWindowSize.js` (in-house) | Conditionally render desktop-only components |
| Meta viewport | index.html | (existing) | Ensure `width=device-width, initial-scale=1` |
| Touch-friendly select | @radix-ui/react-select | `@radix-ui/react-select>=2.1` | Replace native `<select>` |

---

## 4. Mobile Navigation Design

### Current (desktop only)

```
┌────────────────────────────────────────────────────────────────────┐
│  🧬 ClaireOS  │ CRISPR Designer │ Research Report │ Playground │ …  │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile (below lg: 1024px)

**Top bar** — simplified:

```
┌────────────────────────────────────────────────────────────────────┐
│  🧬 ClaireOS                                          [☰] [👤]    │
└────────────────────────────────────────────────────────────────────┘
```

**Hamburger slide-out menu** (right drawer, full height):

```
┌─────────────────────────────────────────────────────┐
│                                        [✕]          │
│  🧬 CRISPR Designer                                  │
│  📊 Research Report                                  │
│  🔬 Playground                                       │
│  💉 Wet Lab Studio                                   │
│  🤖 ART Research                                     │
│  🏥 Clinical Trials                                  │
│  ──────────────────────────────────────────────────  │
│  👤 Profile                                          │
│  ⚙️  Settings                                        │
└─────────────────────────────────────────────────────┘
```

**Bottom tab navigation** (for iPad / tablet — shows 5 most-used tabs always):

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│            Main content area                                       │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  🧬       📊        🔬       🏥        ≡                          │
│ CRISPR  Report  Playground  Trials   More                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. Screen-by-Screen Responsive Redesign

### 5.1 `CrisprDesignerView.jsx` — Mobile Layout

**Desktop (lg:)** — two-column:
```
┌──────────────────────┬─────────────────────────────────┐
│  Gene Input Panel    │  Guide RNA Results Table         │
│  (left 35%)          │  (right 65%)                     │
└──────────────────────┴─────────────────────────────────┘
```

**Mobile (< md:)** — stacked single column:
```
┌─────────────────────────────────────────────────────────┐
│  Gene Input Panel (full width)                          │
│  [Gene: ___________]  [Scan ▶]                         │
└─────────────────────────────────────────────────────────┘
│  Guide RNA Results (full width)                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  g1  Score: 94  Pos: 1234  [Details ▼]          │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  g2  Score: 88  Pos: 1890  [Details ▼]          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Key changes:
- Guide RNA table → accordion cards (`MobileResultCard.jsx`)
- "Details" expands inline (not a side panel)
- Locus track: enable pinch-zoom via `@use-gesture/react`
- "Run Scan" button: full-width, tall (44px+ touch target)
- All input fields: font-size min 16px (prevents iOS auto-zoom)

### 5.2 `ResearchReportView.jsx` — Mobile Tabs

**Desktop:** 5 tabs horizontal
**Mobile:** horizontally scrollable tab bar (no wrapping)

```css
/* Tailwind classes */
.tab-container {
  @apply flex overflow-x-auto whitespace-nowrap gap-2 pb-2 lg:flex-wrap;
}
```

Tab content panels: always full width on mobile.

Long text sections → collapsed with "Read more..." at 200px height.

### 5.3 `PlaygroundView.jsx` — Mobile

- 3D Molecular Viewer (Mol*): **hidden below md:** — too heavy for mobile, replaced with 2D diagram fallback
- Control panels: stack vertically
- Slider inputs: replace with `input[type=range]` with explicit `step` values for fat-finger accuracy

```jsx
{/* 3D viewer only on desktop */}
<div className="hidden md:block">
  <MolecularViewer pdbId={pdbId} />
</div>
<div className="block md:hidden">
  <MolecularViewer2D pdbId={pdbId} />  {/* lightweight SVG diagram */}
</div>
```

### 5.4 `WetLabStudioView.jsx` — Accordion on Mobile

**Desktop:** 3 columns side by side (oligo designer | clone simulator | output)
**Mobile:** Accordion — one section open at a time

```
┌─────────────────────────────────────────────────────────┐
│  ▶ Oligo Designer                                       │  ← collapsed
│  ▼ Clone Simulator                                      │  ← expanded
│    [Input sequence: ________________________]           │
│    [Simulate ▶]                                         │
│  ▶ Synthesis Output                                     │  ← collapsed
└─────────────────────────────────────────────────────────┘
```

### 5.5 `CollaborationSidebar.jsx` — Bottom Sheet on Mobile

**Desktop:** right side panel (fixed width 320px)
**Mobile:** bottom sheet drawer (slides up from bottom)

```
┌──────────────────────────────────────────────────────── ┐
│                  Main Content                            │
│                                                          │
│  [👥 3 online]  ← floating badge (bottom right)          │
└──────────────────────────────────────────────────────────┘
         ▲  tap badge to open
         │
┌─────────────────────────────────────────────────────────┐ ← Bottom Sheet
│  ────  (drag handle)                                    │
│  👥 Collaboration                            [✕]        │
│  [Presence list]                                        │
│  [Notes]                                               │
│  [Sign-offs]                                           │
└─────────────────────────────────────────────────────────┘
```

### 5.6 All Modals → Full Screen on Mobile

```jsx
<div className={`
  fixed inset-0 z-50 bg-white
  md:inset-auto md:rounded-xl md:max-w-2xl md:shadow-2xl
  md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
`}>
```

---

## 6. Touch Interaction Design Rules

| Rule | Implementation |
|------|---------------|
| Minimum touch target: 44×44px | Apply `min-h-[44px] min-w-[44px]` to all buttons and interactive elements |
| Input font-size ≥ 16px | Prevents iOS Safari from auto-zooming on input focus |
| No hover-only interactions | All tooltips accessible via tap (long-press or tap-to-toggle) |
| Swipe left/right between result tabs | `react-swipeable` on tab content container |
| Pinch-zoom on locus track | `@use-gesture/react` `usePinch` hook |
| Pull-to-refresh on result lists | Native browser pull-to-refresh (no JS needed on iOS Safari) |
| No horizontal overflow on < md: | All tables become `overflow-x-auto` scroll containers |

---

## 7. New Frontend Components

### `MobileBottomNav.jsx`

```jsx
// Renders only below lg:
<nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t lg:hidden">
  <div className="flex h-full">
    {NAV_ITEMS.map(item => (
      <NavButton key={item.id} {...item} active={activeView === item.id} />
    ))}
  </div>
</nav>
```

### `MobileSheet.jsx`

```jsx
// Bottom drawer with swipe-to-dismiss
// Props: isOpen, onClose, children, snapPoints (optional)
// Uses @radix-ui/react-dialog with CSS transform animation
```

### `MobileResultCard.jsx`

```jsx
// Compact accordion card for a single guide RNA result
// Props: guide (GuideRNA object), onSelect, onApprove
// Expands to show: sequence, score breakdown, off-targets, sign-off buttons
```

### `TouchLocus.jsx`

```jsx
// Locus track wrapper with pinch-zoom via @use-gesture/react
// Props: children, onZoom, onPan
// Wraps existing LocusTrack component — no changes to LocusTrack itself
```

### `useWindowSize.js` hook

```javascript
// Returns { width, height, isMobile (<768), isTablet (768-1023), isDesktop (≥1024) }
// Uses ResizeObserver (not window.resize event) for performance
```

---

## 8. `index.html` / Meta Changes

Ensure viewport meta tag is correct (likely already exists, verify):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<!-- maximum-scale=5 allows user zoom (accessibility requirement) -->
<!-- Do NOT use maximum-scale=1 — it breaks accessibility -->
```

Add Apple touch icon and PWA manifest entries for "Add to Home Screen" on iPad:

```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
```

`public/manifest.json`:

```json
{
  "name": "Claire Wineland Genomic Copilot",
  "short_name": "ClaireOS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 9. Testing Devices & Breakpoints

| Device | Resolution | Priority |
|--------|-----------|---------|
| iPad Pro 12.9" | 1024×1366 | 🔴 Must pass |
| iPad Air 10.9" | 820×1180 | 🔴 Must pass |
| iPad mini 8.3" | 744×1133 | 🟡 Should pass |
| iPhone 14 Pro | 393×852 | 🟡 Should pass |
| Samsung Galaxy S24 | 360×780 | 🟢 Nice to have |
| Google Pixel 8 | 411×914 | 🟢 Nice to have |

Test using Chrome DevTools device emulator + actual physical iPad if available.

---

## 10. Integration Points with Existing Code

| Existing File | Change Needed |
|---------------|--------------|
| `frontend/src/components/Navbar.jsx` | Add `lg:hidden` hamburger button; hide full nav below `lg:`; add `MobileBottomNav` below the main layout |
| `frontend/src/components/CrisprDesignerView.jsx` | Change grid from `grid-cols-2` → `grid-cols-1 md:grid-cols-2`; wrap results in `MobileResultCard` on mobile |
| `frontend/src/components/ResearchReportView.jsx` | Make tab bar scrollable; add `react-swipeable` for swipe navigation |
| `frontend/src/components/PlaygroundView.jsx` | Hide Mol* below `md:`; show 2D fallback; add `TouchLocus` wrapper |
| `frontend/src/components/WetLabStudioView.jsx` | Change 3-col layout → accordion below `md:` |
| `frontend/src/App.jsx` | Add `MobileSheet` wrapper for collaboration sidebar; add `useWindowSize` hook usage |
| `frontend/index.html` | Verify viewport meta; add PWA manifest link; add touch icons |
| `frontend/src/styles/index.css` (or Tailwind config) | Potentially add custom `touch-action` and `-webkit-overflow-scrolling` utilities |

---

## 11. Day-by-Day Execution Plan

| Day | Task |
|-----|------|
| 1 | Install `react-swipeable`, `@use-gesture/react`, `@radix-ui/react-dialog`. Build `useWindowSize.js`. Add viewport meta + PWA manifest. |
| 2 | Build `MobileBottomNav.jsx`. Modify `Navbar.jsx` — hamburger menu + slide-out drawer. Test on iPad emulator. |
| 3 | Redesign `CrisprDesignerView.jsx` layout with Tailwind responsive prefixes. Build `MobileResultCard.jsx`. |
| 4 | Build `TouchLocus.jsx` with pinch-zoom. Apply to `PlaygroundView.jsx`. Add Mol* hide/show toggle. |
| 5 | Make `WetLabStudioView.jsx` accordion on mobile. Make `ResearchReportView.jsx` tabs horizontally scrollable + swipeable. |
| 6 | Build `MobileSheet.jsx`. Wire `CollaborationSidebar` to use sheet on mobile. Make all modals full-screen on mobile. Full cross-device QA: iPad Air, iPhone 14, Galaxy S24. Push. |
