# Burger Run Tech Stack

## Repo Audit

Date: 2026-06-10

The GitHub repository cloned as an empty repository. There were no existing app files, dependency manifests, build scripts, framework conventions, or package manager locks to preserve.

## Selected Stack

- Runtime: Web browser, mobile-first PWA.
- App framework: React with TypeScript.
- Build tool: Vite.
- 3D renderer: Three.js.
- React renderer: React Three Fiber.
- 3D helpers: Drei.
- State: Zustand.
- Styling: TailwindCSS plus focused CSS for game HUD effects.
- UI animation: Framer Motion.
- Testing: Vitest for deterministic game logic tests.
- PWA: Vite PWA plugin, manifest, icons generated as local SVG assets.
- Native readiness: Capacitor can be added after the PWA foundation is stable.

## Package Manager

Use `npm` for the initial foundation because the empty repo has no existing lockfile or workspace policy.

## Proposed File Structure

```text
src/
  app/
    App.tsx
    GameShell.tsx
  game/
    constants.ts
    types.ts
    math.ts
    runnerStore.ts
    saveSystem.ts
    audioManager.ts
    haptics.ts
    pooling.ts
    spawning.ts
    collision.ts
  components/
    scene/
      BurgerRunnerScene.tsx
      PlayerBurger.tsx
      FactoryTrack.tsx
      FactoryEnvironment.tsx
      Obstacles.tsx
      Collectibles.tsx
      Powerups.tsx
      Effects.tsx
    ui/
      HUD.tsx
      StartScreen.tsx
      PauseMenu.tsx
      GameOverScreen.tsx
      CharacterSelect.tsx
      ShopPanel.tsx
      SettingsPanel.tsx
  styles/
    index.css
  tests/
    runnerLogic.test.ts
```

## Architecture

The game is split into:

- Render layer: React Three Fiber components render pooled track, obstacle, collectible, player, and environment visuals.
- Simulation layer: deterministic logic for lane movement, spawn placement, collision, scoring, timers, and save data.
- State layer: Zustand stores run state, UI mode, settings, selected character, and persistent totals.
- Input layer: keyboard and swipe handlers dispatch normalized runner actions.
- Presentation layer: React HUD and menu components animate with Framer Motion and read state from the store.

## Build Scripts

Required scripts:

- `npm run dev`: start Vite.
- `npm run build`: TypeScript check and production build.
- `npm run preview`: preview production build.
- `npm run test`: run Vitest.
- `npm run lint`: lint source files.

## Migration Recommendation

No migration is needed because the repository is empty. Proceed with the preferred stack as the source of truth.
