
# Scroll-Driven Cosmonaut Pose Animation

## Concept
Create a flipbook-style animation where the cosmonaut changes poses as the user scrolls down the landing page -- appearing to "stand up" and float down to the next section. This uses multiple cosmonaut images that swap based on scroll position.

## Approach

You already have several cosmonaut images in different poses:
- `cosmonaut-left.png` (current hero pose)
- `cosmonaut-hero.png`
- `cosmonaut-connect.png`
- `cosmonaut-fly.png`
- `cosmonaut-clean.png`
- `cosmonaut-moon.png`
- `cosmonaut-ai.png`
- `cosmonaut-industries.png`

We can also **generate additional in-between pose images** using the AI image generation model to create smoother transitions (e.g., partially upright poses).

### Implementation

1. **Generate 3-4 intermediate cosmonaut pose images** using AI image generation to fill gaps between the existing poses (e.g., "leaning back" to "upright" to "floating down"). These will be saved as new assets.

2. **Replace the static `Cosmonaut` component** in `HeroScene3D.tsx` with a new `AnimatedCosmonaut` component that:
   - Loads all pose images as Three.js textures
   - Maps scroll progress ranges to specific images (like keyframes)
   - Cross-fades between poses using opacity on overlapping planes
   - Moves the cosmonaut's Y position downward as scroll progresses

3. **Scroll-to-pose mapping** (example):
   - 0% scroll: Reclined/floating pose (current `cosmonaut-left.png`)
   - 25% scroll: Transitioning upward (generated intermediate)
   - 50% scroll: Upright/standing pose (generated intermediate)
   - 75% scroll: Floating downward (`cosmonaut-fly.png`)
   - 100% scroll: Arriving at next section (`cosmonaut-connect.png`)

4. **Smooth transitions**: Each pose swap uses a brief cross-fade (two overlapping planes with inverse opacity) driven by the scroll progress value already passed as `scrollProgress` prop.

5. **Position animation**: The cosmonaut's Y position shifts downward with scroll, and X position can drift slightly to add natural movement.

## Technical Details

### New/Modified Files

- **Generate new images**: Use AI image generation to create 2-3 intermediate cosmonaut poses with transparent/black backgrounds matching existing style
- **`src/components/landing/scenes/HeroScene3D.tsx`**: 
  - Replace the `Cosmonaut` component with `AnimatedCosmonaut`
  - Load an array of textures (all pose images)
  - Use `scrollProgress` to determine which two adjacent frames to show and their blend factor
  - Render two overlapping `<mesh>` planes with the chroma-key shader, adjusting each one's opacity uniform for cross-fade
  - Animate position (x, y) based on scroll progress
  - Keep the balloon bouquet strings anchored -- the `HAND_ANCHOR` will also interpolate between poses

### Cross-fade shader update
The existing chroma-key fragment shader will get an additional `opacity` uniform so each plane's visibility can be controlled independently for smooth blending.

### Balloon bouquet adjustment
The `HAND_ANCHOR` point will be interpolated between pose-specific anchor positions so the strings always appear connected to the cosmonaut's hand regardless of the current pose.
