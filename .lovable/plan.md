

# Subtle Soft Touch — Warm & Approachable Refinement

## Vision
Keep the muted, professional navy identity but shift the neutral grays slightly **warm** and introduce a **very subtle rose/blush** undertone in a few accent areas. The result should feel calm, polished, and slightly softer — not pink, not girly, just approachable.

## What Changes

### Color Adjustments (in `src/index.css`)

**Light Mode:**
- **Background**: Shift from cool gray (`220 20% 97%`) to a slightly warm off-white (`240 10% 97%`) — barely noticeable but removes the "cold office" feel
- **Card/Popover**: Stays white
- **Accent**: Change from neutral gray (`220 20% 95%`) to a very soft warm lavender-gray (`260 15% 95%`) — adds the subtle "soft" touch without being purple
- **Accent Foreground**: Warm slightly to match (`250 20% 35%`)
- **Muted foreground**: Warm slightly (`240 8% 46%`)
- **Border/Input**: Warm slightly (`240 10% 90%`) — softer edges
- **Chat bubble (agent)**: Slight warm tint (`240 15% 94%`)

**Dark Mode:**
- **Background**: Warm very slightly (`230 35% 7%`)
- **Card**: Slightly warmer dark (`235 18% 11%`)
- **Accent**: Soft warm dark tone (`255 12% 17%`)
- **Border/Input**: Warmer dark borders (`240 12% 20%`)

**Primary colors stay the same** — the muted navy blue remains the brand anchor. Only the neutral surfaces and accents get warmed up.

### Summary of Feel
- Cool navy blue buttons and interactive elements (professional, trustworthy)
- Warm, soft neutral surfaces (approachable, comfortable)
- A hint of lavender in accents (subtle softness without being feminine)
- No pink, no pastels, no rounded "bubbly" changes

### Files Modified
- **`src/index.css`** — Adjust ~12 CSS variable values (background, accent, border, muted tones) in both light and dark themes

### What Stays the Same
- Satoshi font
- Primary navy blue brand color
- Sidebar dark theme
- Channel colors
- All component code (no structural changes)

