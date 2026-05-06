# GroWDash Design System

## 1. Visual Direction

GroWDash uses a precision-glass interface that balances technical clarity with premium polish.
The dashboard prioritizes readability, quick status scanning, and smooth transitions across desktop and mobile.

Core characteristics:
- Neutral base palette with one high-contrast accent color for actions.
- Layered translucent cards (`premium-glass`) over stable backgrounds.
- Tight typography with clear hierarchy for data density.
- Structured grouped rows (`settings-row`) for technical and account data.
- Motion that supports orientation, never distracting from telemetry.

## 2. Color System

### Foundations
- `--background: #f5f5f7`
- `--foreground: #1d1d1f`
- `--card: #ffffff`
- `--border: rgba(0, 0, 0, 0.1)`

### Accent and Actions
- `--primary: #0071e3`
- `--primary-foreground: #ffffff`
- `--ring: #0071e3`

### Supporting tones
- `--muted: #f5f5f7`
- `--muted-foreground: rgba(0, 0, 0, 0.48)`
- `--destructive: #ff3b30`

### Dark mode
Dark mode preserves the same semantic tokens with high contrast:
- `--background: #000000`
- `--card: #1d1d1f`
- `--foreground: #ffffff`
- `--border: rgba(255, 255, 255, 0.1)`

## 3. Typography

### Body
- Font stack: `Inter, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif`
- Tracking: `-0.022em`

### Headings
- Font stack: `Manrope, Inter, Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif`
- Tracking: `-0.012em`
- Line-height: `1.1`

### Practical hierarchy
- Page headers: 24-32px, semibold/bold
- Section titles: 18-24px, semibold
- Row labels: 14-15px, medium
- Metadata/captions: 11-13px

## 4. Core Components

### `premium-glass`
Primary translucent card style for grouped data.
- Uses blur and saturation for layered depth.
- Light and dark variants are tuned separately.

### `settings-row`
Standard horizontal row container for settings and technical attributes.
- Consistent spacing, alignment, and separators.
- Designed for label/value pairs and icon-leading structures.

### `settings-icon-box`
Compact rounded icon container used inside settings rows.

### Navigation layers
- `glass-nav` for top navigation.
- Floating bottom navigation for mobile safe-area support.

## 5. Layout Principles

- Max content width: approximately `980px`.
- Mobile-first spacing; desktop expands density gradually.
- Cards and charts are grouped in vertical sections with clear headings.
- Major pages keep bottom padding for persistent mobile navigation.

## 6. Motion Principles

- Transition easing: `--expo-out: cubic-bezier(0.16, 1, 0.3, 1)`.
- Page transitions prioritize directional continuity.
- Pull-to-refresh has dedicated micro-animations (`ptr-wiggle`, `ptr-pop`, `ptr-text-in`).
- Theme transitions use view-transition masks with controlled duration.

## 7. Accessibility and UX Rules

- Ensure visible focus ring on all interactive controls.
- Keep text contrast high in both themes.
- Avoid color-only communication: pair color with icons/text labels.
- Preserve touch target size and spacing on mobile controls.

## 8. Do / Don't

Do:
- Keep one strong accent color for actions.
- Use grouped rows for technical data consistency.
- Use blur and translucency intentionally for depth.

Don't:
- Introduce multiple competing accent colors.
- Overuse heavy shadows or overly complex gradients.
- Mix unrelated spacing systems within the same page.
