# Burger Run Performance Budget

## Targets

- 60 FPS on modern phones.
- Stable mobile browser performance in portrait orientation.
- Production build should load quickly enough for PWA use.
- Gameplay should avoid unbounded object creation after run start.

## Rendering Budget

- Keep visible gameplay draw calls low by reusing geometries and materials.
- Prefer primitive geometry and instancing-friendly structures for the first foundation.
- Avoid heavy postprocessing on mobile by default.
- Use emissive materials and authored lighting placement instead of expensive full-screen effects.
- Cap particle counts and recycle particles through pools.

## Object Budget

Initial per-run visible object targets:

- Track chunks: 12 to 16 active.
- Obstacles: 20 to 35 active.
- Coin pickups: 50 to 90 active.
- Powerups: 3 to 8 active.
- Decorative background props: bounded by segment and reused.
- Particles: capped per effect type.

## Simulation Budget

- Collision uses simple lane, z-distance, and height checks.
- Spawn generation operates on chunk boundaries, not every frame.
- Zustand updates are batched and scoped to avoid forcing unnecessary UI rerenders.
- Use stable arrays and IDs for pooled objects.

## Asset Budget

Foundation phase uses procedural geometry, CSS, and SVG app icons.

Future authored assets:

- Use compressed GLB.
- Use texture atlases where possible.
- Keep mobile texture sizes conservative.
- Lazy-load non-game screens and large cosmetic assets.

## Quality Settings

Settings should support:

- Visual quality: low, medium, high.
- Reduced effects toggle.
- Audio toggle.
- Haptics toggle.

Low quality should reduce:

- Particle counts.
- Decorative prop density.
- Dynamic light intensity/count.
- Shadow or expensive material usage if added later.

## Profiling Checklist

- Check frame rate while running at high speed.
- Check memory after multiple restarts.
- Check that obstacle, coin, and powerup arrays remain bounded.
- Check mobile safe-area HUD layout.
- Check production build size.
- Check console for runtime warnings.
