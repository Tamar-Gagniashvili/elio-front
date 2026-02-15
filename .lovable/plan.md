

# Design Refresh: Satoshi Font + Deep Navy/Royal Blue Palette

## Overview
Update the entire application's visual identity with the **Satoshi** font and a **deep navy/royal blue** color palette inspired by the image you shared.

## Changes

### 1. Add Satoshi Font
- Add the Satoshi font from a CDN (Fontshare by Indian Type Foundry) to `index.html`
- Update `tailwind.config.ts` to set Satoshi as the default sans-serif font

### 2. Update Color Palette
Replace the current teal/cyan primary colors with deep navy/royal blue across both light and dark modes in `src/index.css`:

| Token | Current (Teal) | New (Navy/Blue) |
|-------|----------------|-----------------|
| Primary | `173 80% 40%` (teal) | `224 76% 48%` (~#1E40AF deep blue) |
| Primary Glow | `173 80% 50%` | `217 91% 60%` (~#3B82F6 bright blue) |
| Accent | `173 60% 94%` (light teal) | `224 76% 96%` (~#EEF2FF soft indigo) |
| Accent Foreground | `173 80% 25%` | `224 76% 30%` |
| Ring | `173 80% 40%` | `224 76% 48%` |
| Sidebar Primary | `173 80% 50%` | `217 91% 60%` |
| Sidebar Background | `222 47% 11%` | `224 71% 8%` (~#0F172A deep navy) |

Dark mode values will be adjusted correspondingly to maintain contrast and readability.

### 3. Files Modified
- **`index.html`** -- Add Satoshi font link from Fontshare CDN
- **`tailwind.config.ts`** -- Change font family from Plus Jakarta Sans to Satoshi
- **`src/index.css`** -- Update all primary, accent, ring, and sidebar color variables in both light and dark themes

### Technical Notes
- Satoshi is loaded from `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap`
- All existing component code references CSS variables, so the color change propagates automatically -- no component files need updating
- The channel-specific colors (WhatsApp green, Telegram blue, etc.) remain unchanged

