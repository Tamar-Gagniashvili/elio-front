

# Lighten the Teal Theme

## Problem
The current teal palette feels too dark, especially the sidebar (`185 18% 12%` = very dark) and the primary color (`172 40% 38%` = deep teal). The overall impression is heavy.

## Changes (in `src/index.css`)

### Light Mode
- **Primary**: Lighten from `172 40% 38%` to `172 35% 45%` -- brighter, friendlier teal
- **Primary glow**: Lighten from `170 45% 48%` to `170 40% 55%`
- **Foreground**: Soften from `200 25% 12%` to `200 20% 18%` -- less harsh black text
- **Ring**: Lighten to match new primary `172 30% 50%`
- **Sidebar background**: Lighten from `185 18% 12%` to `185 15% 18%` -- noticeably lighter, still dark enough for contrast
- **Sidebar accent**: Lighten from `185 14% 18%` to `185 12% 24%`
- **Sidebar border**: Lighten from `185 12% 20%` to `185 10% 26%`
- **Sidebar primary**: Lighten from `172 40% 48%` to `172 35% 55%`

### Dark Mode
- **Primary**: Lighten from `172 38% 48%` to `172 35% 52%`
- **Primary glow**: Lighten from `170 42% 58%` to `170 38% 62%`
- **Sidebar background**: Lighten from `188 18% 8%` to `188 15% 12%`
- **Sidebar accent/border**: Lighten proportionally

### What stays the same
- Background warmth (off-white), accent peach tones, channel colors, card whites, all component code
- The teal hue itself -- just lighter and airier

### File modified
- `src/index.css` -- adjust ~14 lightness values upward

