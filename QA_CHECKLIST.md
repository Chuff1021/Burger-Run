# Burger Run Manual QA Checklist

Use this checklist after each gameplay phase and before release builds.

## Desktop Controls

- [ ] Start run from the main menu.
- [ ] Move left with `ArrowLeft` and `A`.
- [ ] Move right with `ArrowRight` and `D`.
- [ ] Jump with `ArrowUp`, `W`, and `Space`.
- [ ] Slide with `ArrowDown` and `S`.
- [ ] Pause and resume with `P`, `Escape`, and the pause button.

## Mobile Controls

- [ ] Pointer-event swipes work on modern mobile browsers.
- [ ] Swipe left changes one lane left.
- [ ] Swipe right changes one lane right.
- [ ] Swipe up jumps.
- [ ] Swipe down slides.
- [ ] HUD buttons are reachable with safe-area spacing.
- [ ] Text remains readable on small portrait screens.

## Gameplay Loop

- [ ] Score increases while running.
- [ ] Distance increases while running.
- [ ] Speed scales over time.
- [ ] Coins increment run total.
- [ ] Game over triggers after an unprotected obstacle collision.
- [ ] Restart resets the run without page reload.
- [ ] Menu return resets the run state.

## Powerups

- [ ] Magnet collects nearby coins outside the current lane.
- [ ] Shield absorbs a crash.
- [ ] Speed Boost increases run speed and multiplier.
- [ ] Double Coins doubles coin value.
- [ ] Ketchup Rush prevents crash and rewards impacts.
- [ ] Active powerup timers appear in the dock.

## Progression And Persistence

- [ ] Earned coins are added to wallet after game over.
- [ ] Best score persists after reload.
- [ ] Best distance persists after reload.
- [ ] Selected character persists after reload.
- [ ] Settings persist after reload.

## UI Screens

- [ ] Start screen renders over the live 3D scene.
- [ ] HUD shows score, distance, coins, multiplier, mission placeholder, and powerups.
- [ ] Pause menu supports resume, restart, settings, and menu.
- [ ] Game over panel shows rewards and restart flow.
- [ ] Character select opens, selects each launch character, and closes.
- [ ] Upgrade/shop placeholder opens and closes.
- [ ] Settings panel toggles audio, haptics, reduced effects, and quality.

## PWA And Performance

- [ ] `npm run build` succeeds.
- [ ] PWA manifest is generated in `dist`.
- [ ] Service worker is generated in `dist`.
- [ ] No console errors on first load.
- [ ] No Vite error overlay.
- [ ] Arrays for obstacles, coins, and powerups stay bounded across restarts.
- [ ] Mobile browser remains responsive during high-speed running.
- [ ] Reduced effects mode is available for future mobile tuning.
