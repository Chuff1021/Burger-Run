# Browser QA Results

Date: 2026-06-10

Target: `http://localhost:5173/`

## Desktop Viewport

- Page loaded successfully.
- Canvas rendered at `1280 x 720`.
- Start UI rendered with title, HUD, run button, character select, upgrades, settings, and powerup dock.
- No Vite error overlay.
- No console warnings or errors.
- Gameplay started from the Run button.
- Score and distance advanced during active gameplay.
- Keyboard input was accepted for lane movement and jump.

## Mobile Portrait Viewport

Viewport: `390 x 844`

- Canvas filled the viewport.
- Start UI rendered.
- HUD rendered without horizontal overflow.
- Powerup dock rendered.
- Run button and menu buttons were visible and reachable.
- No Vite error overlay.
- No console warnings or errors.

## Build And Test Verification

- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.
- PWA manifest was generated.
- Service worker was generated.

## Remaining Profiling

The in-app browser evaluator did not expose `requestAnimationFrame` or `performance.now()`, so a live frame pacing sample could not be captured from that tool. Follow-up performance work should use Chrome DevTools or a mobile device profile to record:

- FPS during high-speed play.
- Draw calls.
- Memory after repeated restarts.
- JavaScript allocation during spawning and collision.

## Vercel Production QA

Date: 2026-06-10

URL: `https://burger-run.vercel.app/`

- Production page loaded successfully.
- Mobile viewport `390 x 844` rendered the canvas and HUD.
- No Vite error overlay.
- No console warnings or errors.
- Run button started gameplay.
- Pointer-event swipe left changed `data-lane-target` from `1` to `0`.
- Pointer-event swipe right changed `data-lane-target` from `0` back to `1`.
- Unit tests cover left, right, up, down, and below-threshold swipe resolution.
